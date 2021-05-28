'use strict';
const fs = require('fs');
const {promisify} = require('util');
const readFile = promisify(fs.readFile);
const {checkDeps, installDeps} = require('deps-install');
const {extname} = require('path');
const sysPath = require('universal-path');
const anymatch = require('anymatch');
const logger = require('loggy');
// const debug = require('debug')('brunch:config');
const {deepAssign, fsExists, asyncFilter, isSymlink} = require('./helpers');
const deppack = require('deppack'); // isNpm, loadInit
const wrappers = require('./modules');
const loadPlugins = require('./plugins');
const validateConfig = require('./config-validate');
const BrunchError = require('./error');
const DEFAULT_CONFIG_FILENAME = 'brunch-config';

const DEFAULT_CONFIG = {
  files: {
    javascripts: {
      joinTo: 'app.js'
    },
    stylesheets: {
      joinTo: 'app.css'
    }
  }
};

const DEFAULT_CONFIG_CONTENTS = `
module.exports = {
  files: {
    javascripts: {
      joinTo: 'app.js'
    }
  }
};`;

const dontMerge = files => {
  const values = Object.values(files);

  // this fn will be called on every nested object that will be merged
  return (target, source) => {
    if (!values.includes(target)) return () => true;

    // this fn will be called on every enumerable entry in source
    return key => {
      // if either joinTo or entryPoints is overriden but not both, reset the other, as they are supposed to go hand-in-hand
      const otherKey = key === 'joinTo' ? 'entryPoints' : key === 'entryPoints' ? 'joinTo' : null;
      if (otherKey && otherKey in target && !(otherKey in source)) {
        delete target[otherKey];
      }

      return false;
    };
  };
};

const applyOverrides = (config, env) => {
  // Allow the environment to be set from environment variable.
  config.env = env;
  if ('BRUNCH_ENV' in process.env) {
    env.unshift(process.env.BRUNCH_ENV);
  } else if ('NODE_ENV' in process.env) {
    env.unshift(process.env.NODE_ENV);
  }

  // Preserve default config before overriding.
  if (env.length && 'overrides' in config) {
    config.overrides._default = {};
    Object.keys(config).forEach(prop => {
      const isObject = toString.call(config[prop]) === '[object Object]';
      if (prop === 'overrides' || !isObject) return;

      const override = config.overrides._default[prop] = {};
      deepAssign(override, config[prop]);
    });
  }
  env.forEach(override => {
    const plug = config.plugins;
    const overrideProps = config.overrides && config.overrides[override] || {};
    const specials = {on: 'off', off: 'on'};

    // Special override handling for plugins.on|off arrays (gh-826).
    Object.keys(specials).forEach(k => {
      const v = specials[k];
      if (plug && plug[v]) {
        if (overrideProps.plugins == null) overrideProps.plugins = {};
        const item = overrideProps.plugins[v] || [];
        const cItem = config.plugins[v] || [];
        overrideProps.plugins[v] = item.concat(cItem.filter(plugin => {
          const list = overrideProps.plugins[k];
          return list && !list.includes(plugin);
        }));
      }
    });
    deepAssign(config, overrideProps, dontMerge(config.files));
  });
  // ensure server's public path takes overrides into account
  config.server.publicPath = config.paths.public;
};

const normalizeJoinConfig = joinTo => {
  const object = typeof joinTo === 'string' ?
    {[joinTo]: () => true} :
    joinTo || {};

  return Object.keys(object).reduce((subCfg, path) => {
    const checker = object[path];
    subCfg[path] = anymatch(checker);
    return subCfg;
  }, {});
};

const normalizePluginHelpers = (items, subCfg) => {
  if (items) return [].concat(items);

  const destFiles = Object.keys(subCfg);
  const joinMatch = destFiles.find(file => subCfg[file]('vendor/.'));
  if (joinMatch) return [joinMatch];
  const nameMatch = destFiles.find(file => /vendor/i.test(file));
  if (nameMatch) return [nameMatch];
  return [destFiles[0]];
};

/* Converts `config.files[...].joinTo` to one format.
 * config.files[type].joinTo can be a string, a map of {str: regexp} or a map
 * of {str: function}.
 * Also includes `config.files.javascripts.entryPoints`.
 *
 * Example output:
 *
 * {
 *   javascripts: {'*': {'javascripts/app.js': checker}, 'app/init.js': {'javascripts/bundle.js': 'app/init.js'}},
 *   templates: {'*': {'javascripts/app.js': checker2}}
 * }
 */
const createJoinConfig = (cfgFiles, paths) => {
  if (cfgFiles.javascripts && 'joinTo' in cfgFiles.javascripts) {
    if (!cfgFiles.templates) cfgFiles.templates = {};
    if (!('joinTo' in cfgFiles.templates)) {
      cfgFiles.templates.joinTo = cfgFiles.javascripts.joinTo;
    }
  }

  const types = Object.keys(cfgFiles);
  const joinConfig = types.reduce((joinConfig, type) => {
    const fileCfg = cfgFiles[type];
    const subCfg = normalizeJoinConfig(fileCfg.joinTo);
    joinConfig[type] = subCfg;

    // special matching for plugin helpers
    const helpers = fileCfg.pluginHelpers;
    subCfg.pluginHelpers = normalizePluginHelpers(helpers, subCfg);
    return joinConfig;
  }, {});

  // the joinTo is just a special case of entryPoints
  const entryPoints = types.reduce((entryPoints, type) => {
    const point = entryPoints[type] = {};
    if (type in joinConfig) point['*'] = joinConfig[type];
    return entryPoints;
  }, {});

  const outPaths = [];
  types.forEach(type => {
    const fileCfg = cfgFiles[type];
    if (!fileCfg.entryPoints) return;
    if (type !== 'javascripts') {
      logger.warn(`entryPoints can only be used with 'javascripts', not '${type}'`);
      return;
    }

    Object.keys(fileCfg.entryPoints).forEach(target => {
      const isTargetWatched = paths.watched.some(path => target.startsWith(`${path}/`));
      if (!isTargetWatched) {
        logger.error(`The correct use of entry points is: \`'entryFile.js': 'outputFile.js'\`. The entryFile ${target} is not inside of a watched directory, add directory path to the watched array`);
      }
      const entryCfg = fileCfg.entryPoints[target];
      const alreadyDefined = Object.keys(entryCfg).some(out => out in joinConfig[type]);
      if (alreadyDefined) {
        logger.warn(`config.files.${type}.joinTo is already defined for '${target}', can't add an entry point`);
        return;
      }

      const normalizedEntryCfg = normalizeJoinConfig(entryCfg);
      Object.keys(normalizedEntryCfg).forEach(path => {
        if (outPaths.includes(path)) {
          logger.warn(`'${path}' is already used by another entry point, can't add it to config.files.${type}.entryPoints for '${target}'`);
          delete normalizedEntryCfg[path];
          return;
        }

        outPaths.push(path);
      });
      entryPoints[type][target] = normalizedEntryCfg;
    });
  });

  return Object.freeze(entryPoints);
};

const setLoggyOptions = config => {
  if (config === false) {
    logger.notifications = false;
    return;
  }

  if (config === true) {
    logger.warn('`config.notifications: true` is deprecated. Notifications are on by default. Remove the option');
    config = {};
  } else if (Array.isArray(config)) {
    logger.warn('`config.notifications` array is deprecated. Use `config.notifications.levels` instead.');
    config = {levels: config};
  }

  Object.assign(logger.notifications, {
    app: 'Brunch',
    icon: sysPath.resolve(__dirname, '..', 'logo.png'),
  }, config);
};

const setConfigDefaults = (config, configPath) => {
  setLoggyOptions(config.notifications);

  const join = (parent, name) => {
    return sysPath.isAbsolute(name) ? name : sysPath.join(config.paths[parent], name);
  };
  const joinRoot = name => join('root', name);

  // Paths.
  const paths = config.paths;

  paths.public = joinRoot(paths.public);
  paths.watched = paths.watched.map(joinRoot);

  if (paths.config == null) paths.config = configPath || joinRoot('config');
  paths.packageConfig = joinRoot(paths.packageConfig);

  // Conventions.
  const conventions = config.conventions;
  if (paths.ignored) {
    conventions.ignored = paths.ignored;
  }

  // Server.
  const server = config.server;
  server.publicPath = paths.public;
  if (server.run == null) server.run = false;
  if (!config.persistent) server.run = false;

  // Hooks.
  if (config.onCompile) {
    config.hooks.onCompile = config.onCompile;
  }
  if (config.preCompile) {
    config.hooks.preCompile = config.preCompile;
  }
};

const normalizeConfig = config => {
  const {paths, modules, watcher} = config;

  const maybeConfigs = Object.keys(require.extensions).map(ext => paths.config + ext);
  const allConfigFiles = [paths.packageConfig].concat(maybeConfigs);
  const conventions = {};

  Object.keys(config.conventions).forEach(key => {
    const include = key === 'ignored' ? allConfigFiles : [];
    const checker = include.concat(config.conventions[key]);
    const fn = anymatch(checker);

    conventions[key] = key === 'vendor' ? fn :
      path => !deppack.isNpm(path) && fn(path);
  });

  config._normalized = {
    join: createJoinConfig(config.files, paths),
    paths: Object.assign({allConfigFiles}, paths),
    conventions,
    packageInfo: {},
    persistent: config.persistent,
    isProduction: !!config.isProduction,
    watcher: {
      usePolling: watcher.usePolling,
      awaitWriteFinish: watcher.awaitWriteFinish === true ?
        {stabilityThreshold: 50, pollInterval: 10} :
        watcher.awaitWriteFinish,
    },
    modules: {
      wrapper: wrappers.normalizeWrapper(modules.wrapper, modules.nameCleaner),
      definition: wrappers.normalizeDefinition(modules.definition),
      autoRequire: modules.autoRequire,
    },
  };
};

const trimTrailingSlashes = config => {
  const paths = config.paths;
  const trim = path => path.replace(/\/$/, '');

  paths.public = trim(paths.public);
  paths.watched = paths.watched.map(trim);
};

const addDefaultServer = config => {
  if (config.server.path) return;
  try {
    const defaultServerFilename = 'brunch-server';
    const resolved = require.resolve(sysPath.resolve(defaultServerFilename));
    try {
      require(resolved);
    } catch (error) {
      // Do nothing.
    }
    if (config.server.path == null) {
      config.server.path = resolved;
    }
  } catch (error) {
    // Do nothing.
  }
};

const addPackageManagers = async config => {
  try {
    const {root, packageConfig} = config.paths;
    const rootPath = sysPath.resolve(root);
    const jsonPath = sysPath.resolve(rootPath, packageConfig);
    const json = require(jsonPath);
    const npm = await deppack.loadInit(config, json);
    config._normalized.packageInfo.npm = npm;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new BrunchError('PKG_JSON_MISSING');
    } else if (error instanceof SyntaxError) {
      throw new BrunchError('PKG_JSON_INVALID', {error});
    }
    throw error;
  }
};

async function checkProjectDependencies(config) {
  const root = config.paths.root;
  const pkgs = await checkDeps(root, !config._normalized.isProduction);
  if (!pkgs.length) return;
  const unmet = await asyncFilter(pkgs, pkg => {
    return isSymlink(sysPath.join(root, 'node_modules', pkg)).then(x => !x);
  });
  if (!unmet.length) return;
  logger.info(`Using outdated versions of ${unmet.join(', ')}, trying to update to match package.json versions`);
  await installDeps(root, {logger});
}

async function loadPackageJSON(root) {
  const path = sysPath.join(root, 'package.json');
  try {
    const data = await readFile(path, 'utf-8');
    const pkg = JSON.parse(data);
    return pkg;
  } catch (error) {
    // package.json must always exist.
    throw new BrunchError('PKG_JSON_MISSING');
  }
}

async function tryToLoad(root, configPath, pkg) {
  // read package.json
  // const bn = /\.\w{1,10}$/.test(configPath) ? configPath : configPath + '.js';
  const bname = extname(configPath) ? configPath : configPath + '.js';
  const fullConfigPath = sysPath.isAbsolute(bname) ? bname : sysPath.join(root, bname);
  let brunchConfig;

  if (pkg.brunch) {
    // Case a): package.json with `brunch` field exists
    brunchConfig = Object.assign({}, DEFAULT_CONFIG, pkg.brunch);
  } else if (await fsExists(fullConfigPath)) {
    // Case b): brunch-config.js exists
    const fullPath = require.resolve(sysPath.resolve(fullConfigPath));
    delete require.cache[fullPath];

    let obj;

    try {
      obj = require(fullPath);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') {
        throw new BrunchError('CFG_INVALID');
      }
      const path = /^Cannot find module '(.+)'/.exec(error.message)[1];
      const configDep = path.split('/', 1)[0];
      const deps = {...pkg.dependencies, ...pkg.devDependencies};
      if (configDep in deps) {
        logger.warn(`brunch-config requires '${configDep}' which is in package.json but wasn't yet installed. Trying to install...`);
        await installDeps('.', {logger});
        return tryToLoad(root, configPath, pkg);
      }
    }
    const basename = sysPath.basename(fullPath);
    const config = obj && obj.config || obj;
    if (config !== Object(config)) {
      throw new BrunchError('CFG_NOT_OBJECT', {basename});
    }
    if (!config.files) {
      throw new BrunchError('CFG_NO_FILES', {basename, minimalConfig: DEFAULT_CONFIG_CONTENTS});
    }
    brunchConfig = Object.assign({}, DEFAULT_CONFIG, config);
  } else {
    // Case c): neither exist, generate default config.
    brunchConfig = DEFAULT_CONFIG;
    // Check if coffeescript configs from brunch 2 exist,
    // Emit a warning if they do.
    // Don't block main thread with it, so no await.
    asyncFilter(['config.coffee', 'brunch-config.coffee'], file => {
      return fsExists(sysPath.join(root, file));
    }).then(list => {
      if (list.length) {
        logger.error('brunch-config with coffeescript is no longer supported. Compile it to JS: \n\nnpm install --global coffeescript\ncoffee --bare --compile brunch-config.coffee');
      }
    });
  }
  return brunchConfig;
}

/* Generate params that will be used as default config values.
 *
 * persistent - Boolean. Determines if brunch should run a web server.
 * options    - Object. {optimize, publicPath, server, port}.
 *
 * Returns Object.
 */

function initParams(persistent, options) {
  const env = options.env;
  const params = {
    persistent,
    stdin: options.stdin != null,
    env: env ? env.split(',') : [],
  };
  if (options.production == null && process.env.NODE_ENV !== 'production') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  } else {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    params.isProduction = true;
    params.env.unshift('production');
  }
  if (options.publicPath) {
    params.paths = {
      public: options.publicPath,
    };
  }
  if (persistent) {
    const server = params.server = {};
    if (options.server) server.run = true;
    if (options.network) server.hostname = '0.0.0.0';
    if (options.port) server.port = options.port;
  }
  return params;
}


async function loadConfig(options) {
  const {fromWorker} = options;
  const rootPath = options.path || '.';
  const configPath = options.config || DEFAULT_CONFIG_FILENAME;
  const pkg = await loadPackageJSON(rootPath);
  const config = await tryToLoad(rootPath, configPath, pkg);
  await validateConfig(config);
  setConfigDefaults(config, configPath);
  if (!fromWorker) addDefaultServer(config);

  const params = initParams(options.persistent, options);
  applyOverrides(config, params.env);
  deepAssign(config, params);
  trimTrailingSlashes(config);
  normalizeConfig(config);
  await checkProjectDependencies(config);
  if (!fromWorker) await addPackageManagers(config);

  // DOES NOT WORK right now!
  // deepFreeze(config, ['static', 'overrides']);
  return config;
}

async function loadConfigAndPlugins(options) {
  const cfg = await loadConfig(options);
  const plg = await loadPlugins(cfg, options.dependencies);
  return [cfg, plg];
}

exports.loadConfig = loadConfig;
exports.loadConfigAndPlugins = loadConfigAndPlugins;
