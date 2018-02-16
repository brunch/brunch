'use strict';
require('micro-es7-shim');
require('coffeescript').register();

const checkDeps = require('check-dependencies');
const sysPath = require('universal-path');
const anymatch = require('anymatch');
const logger = require('loggy');
const readComponents = require('read-components');
const debug = require('debug')('brunch:config');
const helpers = require('./helpers');
const deppack = require('deppack'); // isNpm, loadInit
const wrappers = require('./modules');
const validateConfig = require('./config-validate');
const BrunchError = require('./error');
const install = require('deps-install');
const defaultConfigFilename = 'brunch-config';

const checkNpmModules = config => {
  if (config.npm.enabled && config.modules.definition !== 'commonjs' && config.modules.wrapper !== 'commonjs') {
    throw new BrunchError('NPM_NOT_COMMONJS', config.modules);
  }
  return config;
};

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
      helpers.deepAssign(override, config[prop]);
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
    helpers.deepAssign(config, overrideProps, dontMerge(config.files));
  });
  // ensure server's public path takes overrides into account
  config.server.publicPath = config.paths.public;
  return config;
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
        logger.warn(`The correct use of entry points is: \`'entryFile.js': 'outputFile.js'\`. You are trying to use '${target}' as an entry point, but it is probably an output file.`);
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
  paths.bowerConfig = joinRoot(paths.bowerConfig);

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

  return config;
};

const normalizeConfig = config => {
  const paths = config.paths;
  const modules = config.modules;
  const watcher = config.watcher;

  const maybeConfigs = Object.keys(require.extensions).map(ext => paths.config + ext);
  const allConfigFiles = [paths.packageConfig, paths.bowerConfig].concat(maybeConfigs);
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

  return config;
};

const trimTrailingSlashes = config => {
  const paths = config.paths;
  const trim = path => path.replace(/\/$/, '');

  paths.public = trim(paths.public);
  paths.watched = paths.watched.map(trim);

  return config;
};

const addDefaultServer = config => {
  if (config.server.path) return config;
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
  return config;
};

const loadBower = config => {
  // Since readComponents call its callback with many arguments, we hate to wrap it manually
  const rootPath = config.paths.root;
  const readBower = () => new Promise((resolve, reject) => {
    if (!config.bower.enabled) return resolve([]);
    readComponents(rootPath, 'bower', (err, components) => {
      if (err) reject(err);
      else resolve(components || []);
    });
  });

  return readBower().then(components => {
    const order = components
      .sort((a, b) => {
        if (a.sortingLevel === b.sortingLevel) {
          return a.files[0] < b.files[0] ? -1 : 1;
        }
        return b.sortingLevel - a.sortingLevel;
      })
      .reduce((files, component) => {
        return files.concat(component.files);
      }, []);

    return {components, order};
  }, error => {
    switch (error.code) {
      case 'NO_BOWER_JSON':
        logger.error('You probably need to execute `bower install` here.', error);
        return install({rootPath, pkgType: 'bower'}).then(readBower);
      case 'ENOENT':
        logger.error(error);
        break;
    }

    return {components: [], order: []}; // Default values
  });
};

const loadNpm = config => new Promise(resolve => {
  const paths = config.paths;
  const rootPath = sysPath.resolve(paths.root);
  const jsonPath = sysPath.resolve(rootPath, paths.packageConfig);
  const json = require(jsonPath);
  resolve(deppack.loadInit(config, json));
}).catch(error => {
  if (error.code === 'MODULE_NOT_FOUND') {
    throw new BrunchError('PKG_JSON_MISSING');
  } else if (error instanceof SyntaxError) {
    throw new BrunchError('PKG_JSON_INVALID', {error});
  }
  throw error;
});

const checkComponents = config => {
  const path = sysPath.resolve(config.paths.root, 'component.json');
  helpers.fsExists(path).then(exists => {
    if (exists) {
      logger.warn('Detected component.json in project root. Component.json is no longer supported. You could switch to keeping dependencies in NPM (package.json), or revert to Brunch 2.2.');
    }
  });
};

const addPackageManagers = config => {
  checkComponents(config);
  return Promise.all([
    loadNpm(config),
    loadBower(config),
  ]).then(components => {
    const norm = config._normalized.packageInfo;
    norm.npm = components[0];
    norm.bower = components[1];
    return config;
  });
};

const minimalConfig = `
module.exports = {
  files: {
    javascripts: {
      joinTo: 'app.js'
    }
  }
};`;

const tryToLoad = (configPath, fallbackHandler) => {
  let fullPath;
  let basename = configPath;

  return new Promise(resolve => {
    debug(`Trying to load ${configPath}`);
    // Assign fullPath in two steps in case require.resolve throws.
    fullPath = sysPath.resolve(configPath);
    fullPath = require.resolve(fullPath);
    delete require.cache[fullPath];
    const resolved = require(fullPath);
    basename = sysPath.basename(fullPath);
    resolve(resolved);
  }).then(obj => {
    const config = obj && obj.config || obj;
    if (config !== Object(config)) {
      throw new BrunchError('CFG_NOT_OBJECT', {basename});
    }
    if (!config.files) {
      throw new BrunchError('CFG_NO_FILES', {basename, minimalConfig});
    }
    return config;
  }).catch(error => {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw new BrunchError('CFG_LOAD_FAILED', {error});
    }

    const path = /^Cannot find module '(.+)'/.exec(error.message)[1];
    if (path.includes(fullPath)) {
      if (!fallbackHandler) {
        fallbackHandler = () => {
          logger.error(`The directory does not seem to be a Brunch project. Create ${basename}.js or run brunch from the correct directory. ${error.toString().replace('Error: ', '')}`);
          logger.error(`Here's a minimal brunch-config.js to get you started:\n${minimalConfig}`);
          process.exit(1);
        };
      }

      if (configPath === defaultConfigFilename) {
        return tryToLoad('config', fallbackHandler);
      }

      fallbackHandler();
    } else if (!path.startsWith('.')) {
      try {
        const pkg = require(sysPath.resolve('.', 'package.json'));
        if (pkg) {
          const topLevelMod = path.split('/', 1)[0];
          const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
          if (topLevelMod in deps) {
            logger.warn(`Config requires '${topLevelMod}' which is in package.json but wasn't yet installed. Trying to install...`);
            return install({pkgType: 'package'}).then(() => tryToLoad(configPath));
          }
        }
      } catch (e) {
        // error
      }
    }

    throw error;
  });
};

const checkProjectDependencies = config => {
  const packageDir = config.paths.root;
  const scopeList = config._normalized.isProduction ?
    ['dependencies'] :
    ['dependencies', 'devDependencies'];

  return checkDeps({packageDir, scopeList}).then(out => {
    if (out.depsWereOk) return;
    const pkgs = out.error.filter(x => x.includes(':')).map(x => x.split(':', 1)[0]);
    throw pkgs;
  }).catch(pkgs => {
    // filter out symlinked packages
    const pkgPath = pkg => sysPath.join(packageDir, 'node_modules', pkg);
    const isNotSymlink = pkg => helpers.isSymlink(pkgPath(pkg)).then(x => !x);
    return helpers.asyncFilter(pkgs, isNotSymlink).then(unmetPkgs => {
      if (!unmetPkgs.length) return;
      logger.info(`Using outdated versions of ${unmetPkgs.join(', ')}, trying to update to match package.json versions`);
      return install({rootPath: packageDir, pkgType: 'package'});
    });
  }).then(() => config);
};

const dontFreeze = ['static', 'overrides'];

const loadConfig = (persistent, options, fromWorker) => {
  const configPath = options.config || defaultConfigFilename;
  const params = initParams(persistent, options);

  return tryToLoad(configPath)
    .then(validateConfig)
    .then(checkNpmModules)
    .then(config => setConfigDefaults(config, configPath))
    .then(fromWorker || addDefaultServer)
    .then(config => applyOverrides(config, params.env))
    .then(config => helpers.deepAssign(config, params))
    .then(trimTrailingSlashes)
    .then(normalizeConfig)
    .then(checkProjectDependencies)
    .then(fromWorker || addPackageManagers)
    .then(helpers.deepFreeze(dontFreeze));
};

// worker don't need default server, deprecation warnings, or package manager support
const loadConfigWorker = (persistent, options) => {
  return loadConfig(persistent, options, true);
};

/* Generate params that will be used as default config values.
 *
 * persistent - Boolean. Determines if brunch should run a web server.
 * options    - Object. {optimize, publicPath, server, port}.
 *
 * Returns Object.
 */

const initParams = (persistent, options) => {
  const env = options.env;
  const params = {
    persistent,
    stdin: options.stdin != null,
    env: env ? env.split(',') : [],
  };
  if (options.production == null && process.env.NODE_ENV !== 'production') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  } else {
    process.env.NODE_ENV = 'production';
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
};

module.exports = {
  setConfigDefaults,
  loadConfig,
  loadConfigWorker,
};
