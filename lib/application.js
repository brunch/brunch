'use strict';
const sysPath = require('path');
const exec = require('child_process').exec;
const logger = require('loggy');
const readComponents = require('read-components');
const anymatch = require('anymatch');
const coffee = require('coffee-script');
const debug = require('debug')('brunch:application');
const deppack = require('./deppack');
const mediator = require('./mediator');
const mdls = require('./modules');
const helpers = require('./helpers');

coffee.register();

const defaultConfigFilename = 'brunch-config';
// const anotherConfigFilename = 'config';
const defaultServerFilename = 'brunch-server';
const brunchPluginPattern = 'brunch';

// temp stuff for tests.
const isWindows = exports.isWindows = helpers.isWindows;

const deepExtend = helpers.deepExtend;

const applyOverrides = (config, options) => {

  /* Allow the environment to be set from environment variable */
  config.env = options.env;
  const environments = options.env;
  if (process.env.BRUNCH_ENV != null) {
    environments.unshift(process.env.BRUNCH_ENV);
  }

  /* Preserve default config before overriding */
  if (environments.length && 'overrides' in config) {
    config.overrides._default = {};
    Object.keys(config).forEach(prop => {
      const isObject = toString.call(config[prop]) === '[object Object]';
      if (prop === 'overrides' || !isObject) {
        return;
      }
      config.overrides._default[prop] = {};
      return deepExtend(config.overrides._default[prop], config[prop]);
    });
  }
  environments.forEach(override => {
    const plug = config.plugins;
    const overrideProps = (config.overrides && config.overrides[override]) || {};

    /* Special override handling for plugins.on|off arrays (gh-826) */
    const specials = {on: 'off', off: 'on'};
    Object.keys(specials).forEach(k => {
      const v = specials[k];
      if (plug && plug[v]) {
        if (overrideProps.plugins == null) overrideProps.plugins = {};
        const item = overrideProps.plugins[v] || [];
        const cItem = config.plugins[v] || [];
        overrideProps.plugins[v] = item.concat(cItem.filter(plugin => {
          const list = overrideProps.plugins[k] || [];
          return list.indexOf(plugin) === -1;
        }));
      }
    });
    return deepExtend(config, overrideProps, config.files);
  });
  return config;
};

const deepFreeze = object => {
  Object.keys(Object.freeze(object))
    .map(key => object[key])
    .filter(value => {
      return value && typeof value === 'object' && !Object.isFrozen(value);
    })
    .forEach(deepFreeze);
  return object;
};

exports.install = (rootPath, command) => {
  const prevDir = process.cwd();
  logger.info('Installing ' + command + ' packages...');
  process.chdir(rootPath);

  return new Promise((resolve, reject) => {
    exec(command + ' install', (error, stdout, stderr) => {
      process.chdir(prevDir);
      if (error != null) {
        const log = stderr.toString();
        logger.error(log);
        return reject(log);
      }
      resolve(stdout);
    });
  });
};

const replaceSlashes = helpers.replaceSlashes;
const replaceConfigSlashes = exports.replaceConfigSlashes = config => {
  if (!isWindows) return config;
  const files = config.files || {};
  Object.keys(files).forEach(language => {
    const lang = files[language] || {};
    const order = lang.order || {};

    /* Modify order. */
    Object.keys(order).forEach(orderKey => {
      return lang.order[orderKey] = lang.order[orderKey].map(replaceSlashes);
    });

    /* Modify join configuration. */
    switch (toString.call(lang.joinTo)) {
      case '[object String]':
        lang.joinTo = replaceSlashes(lang.joinTo);
        break;
      case '[object Object]':
        const newJoinTo = {};
        Object.keys(lang.joinTo).forEach(joinToKey => {
          return newJoinTo[replaceSlashes(joinToKey)] = lang.joinTo[joinToKey];
        });
        lang.joinTo = newJoinTo;
    }
  });
  return config;
};


/* Config items can be a RegExp or a function.
 * The function makes universal API to them.
 *
 * item - RegExp or Function
 *
 * Returns Function.
 */

const normalizeChecker = anymatch;


/* Converts `config.files[...].joinTo` to one format.
 * config.files[type].joinTo can be a string, a map of {str: regexp} or a map
 * of {str: function}.
 *
 * Example output:
 *
 * {
 *   javascripts: {'javascripts/app.js': checker},
 *   templates: {'javascripts/app.js': checker2}
 * }
 *
 * Returns Object of Object-s.
 */

const createJoinConfig = configFiles => {

  /* Can be used in `reduce` as `array.reduce(listToObj, {})`. */
  const listToObj = (acc, elem) => {
    acc[elem[0]] = elem[1];
    return acc;
  };
  const types = Object.keys(configFiles);
  const joinConfig = types.map(type => {
    return configFiles[type].joinTo;
  }).map(joinTo => {
    if (typeof joinTo === 'string') {
      const object = {};
      object[joinTo] = /.+/;
      return object;
    } else {
      return joinTo;
    }
  }).map((joinTo, index) => {
    const makeChecker = generatedFilePath => {
      return [generatedFilePath, normalizeChecker(joinTo[generatedFilePath])];
    };
    const subCfg = Object.keys(joinTo).map(makeChecker).reduce(listToObj, {});
    return [types[index], subCfg];
  }).reduce(listToObj, {});

  const vendorRe = /vendor/i;

  /* special matching for plugin helpers */
  types.forEach(type => {
    let items = configFiles[type].pluginHelpers;
    if (!items) {
      items = (() => {
        const destFiles = Object.keys(joinConfig[type]);
        const joinMatch = destFiles.filter(file => {
          return joinConfig[type][file]('vendor/.');
        });
        if (joinMatch.length > 0) {
          return [joinMatch[0]];
        }
        const nameMatch = destFiles.filter(file => vendorRe.test(file));
        if (nameMatch.length > 0) return [nameMatch[0]];
        return [destFiles.shift()];
      })();
    }
    if (!Array.isArray(items)) items = [items];
    joinConfig[type].pluginHelpers = items;
  });
  return Object.freeze(joinConfig);
};

const ensureType = (obj, key, type) => {
  const item = obj[key];
  const cls = typeof item;
  const error = `config.paths[${key}] must be a ${type}`;
  if (type === 'string' && cls !== 'string') throw new Error(error);
  else if (type === 'array' && !Array.isArray(obj[key])) throw new Error(error);
};

const setConfigDefaults = exports.setConfigDefaults = (config, configPath) => {
  const join = (parent, name) => {
    return sysPath.join(config.paths[parent], name);
  };
  const joinRoot = name => {
    return join('root', name);
  };

  // Paths.
  const paths = config.paths != null ? config.paths : config.paths = {};

  if (paths.root == null) paths.root = '.';
  ensureType(paths, 'root', 'string');

  if (paths['public'] == null) paths['public'] = joinRoot('public');
  ensureType(paths, 'public', 'string');

  if (paths.watched == null) paths.watched = ['app', 'test', 'vendor'].map(joinRoot);

  if (typeof paths.watched === 'string') paths.watched = [paths.watched];
  ensureType(paths, 'watched', 'array');

  if (paths.config == null) paths.config = configPath || joinRoot('config');
  if (paths.packageConfig == null) paths.packageConfig = joinRoot('package.json');
  if (paths.bowerConfig == null) paths.bowerConfig = joinRoot('bower.json');

  // Conventions.
  const conventions = config.conventions != null ? config.conventions : config.conventions = {};
  if (conventions.assets == null) conventions.assets = /assets[\\\/]/;
  if (conventions.ignored == null) {
    conventions.ignored = paths.ignored || [/[\\\/]_/, /vendor[\\\/](node|j?ruby-.*|bundle)[\\\/]/];
  }
  if (conventions.vendor == null) {
    conventions.vendor = /(^bower_components|node_modules|vendor)[\\\/]/;
  }

  // General.
  if (config.notifications == null) config.notifications = true;
  if (config.sourceMaps == null) config.sourceMaps = true;
  if (config.optimize == null) config.optimize = false;
  if (config.plugins == null) config.plugins = {};

  // Modules.
  const modules = config.modules != null ? config.modules : config.modules = {};
  if (modules.wrapper == null) modules.wrapper = 'commonjs';
  if (modules.definition == null) modules.definition = 'commonjs';
  if (modules.nameCleaner == null) {
    modules.nameCleaner = path => path.replace(/^app\//, '');
  }
  if (modules.autoRequire == null) modules.autoRequire = {};

  // Server.
  const server = config.server != null ? config.server : config.server = {};
  if (server.base == null) server.base = '';
  if (server.port == null) server.port = 3333;
  if (server.run == null) server.run = false;

  // Overrides.
  const overrides = config.overrides != null ? config.overrides : config.overrides = {};
  const production = overrides.production != null ? overrides.production : overrides.production = {};
  if (production.optimize == null) production.optimize = true;
  if (production.sourceMaps == null) production.sourceMaps = false;
  if (production.plugins == null) production.plugins = {};
  const pl = production.plugins;
  if (pl.autoReload == null) pl.autoReload = {};
  const ar = pl.autoReload;
  if (ar.enabled == null) ar.enabled = false;
  const npm = config.npm != null ? config.npm : config.npm = {};
  if (npm.enabled == null) npm.enabled = false;
  return config;
};

const warnAboutConfigDeprecations = config => {
  const messages = [];
  const warnRemoved = path => {
    if (config.paths[path]) {
      return messages.push('config.paths.' + path + ' was removed, use config.paths.watched');
    }
  };
  const warnMoved = (configItem, from, to) => {
    if (configItem) {
      return messages.push('config.' + from + ' moved to config.' + to);
    }
  };
  const ensureNotArray = name => {
    if (Array.isArray(config.paths[name])) {
      return messages.push('config.paths.' + name + " can't be an array. Use config.conventions." + name);
    }
  };
  warnRemoved('app');
  warnRemoved('test');
  warnRemoved('vendor');
  warnRemoved('assets');
  warnMoved(config.paths.ignored, 'paths.ignored', 'conventions.ignored');
  warnMoved(config.rootPath, 'rootPath', 'paths.root');
  warnMoved(config.buildPath, 'buildPath', 'paths.public');
  ensureNotArray('assets');
  ensureNotArray('test');
  ensureNotArray('vendor');
  messages.forEach(logger.warn);
  return config;
};

const normalizeConfig = config => {
  const normalized = {};
  normalized.join = createJoinConfig(config.files);
  const mod = config.modules;
  normalized.modules = {};
  normalized.modules.wrapper = mdls.normalizeWrapper(mod.wrapper, config.modules.nameCleaner);
  normalized.modules.definition = mdls.normalizeDefinition(mod.definition);
  normalized.modules.autoRequire = mod.autoRequire;
  normalized.conventions = {};
  Object.keys(config.conventions).forEach(name => {
    return normalized.conventions[name] = normalizeChecker(config.conventions[name]);
  });
  normalized.paths = Object.assign({}, config.paths);
  normalized.paths.possibleConfigFiles = Object.keys(require.extensions).map(ext => {
    return config.paths.config + ext;
  }).reduce((obj, path) => {
    obj[path] = true;
    return obj;
  }, {});
  normalized.paths.allConfigFiles = [
    config.paths.packageConfig, config.paths.bowerConfig
  ].concat(Object.keys(normalized.paths.possibleConfigFiles));
  normalized.packageInfo = {};
  normalized.persistent = config.persistent;
  normalized.usePolling = !!(config.watcher && config.watcher.usePolling);
  normalized.awaitWriteFinish = !!(config.watcher && config.watcher.awaitWriteFinish);
  config._normalized = normalized;
  ['on', 'off', 'only'].forEach(key => {
    if (typeof config.plugins[key] === 'string') {
      return config.plugins[key] = [config.plugins[key]];
    }
  });
  return config;
};

const addDefaultServer = config => {
  if (config.server.path) return config;
  try {
    const resolved = require.resolve(sysPath.resolve(defaultServerFilename));
    require(resolved);
    if (config.server.path == null) {
      config.server.path = resolved;
    }
  } catch (error1) {
    /* Do nothing. */
  }
  return config;
};

const enoentRe = /ENOENT/;
const loadComponents = (config, type) => {
  // Since readComponents call its callback with many arguments, we hate to wrap it manually
  return new Promise((resolve, reject) => {
    readComponents('.', type, (err, components, aliases) => {
      if (err) return reject(err);

      return resolve({components: components, aliases: aliases});
    });
  }).then(o => {
    const components = o.components || [];
    const aliases = o.aliases;
    const order = components
      .sort((a, b) => {
        if (a.sortingLevel === b.sortingLevel) {
          return a.files[0] < b.files[0] ? -1 : 1;
        } else {
          return b.sortingLevel - a.sortingLevel;
        }
      })
      .reduce(((flat, component) => flat.concat(component.files)), []);
    return {
      components: components,
      aliases: aliases,
      order: order
    };
  }, error => {
    const errStr = error.toString();
    if (error.code === 'NO_BOWER_JSON') {
      logger.error('You probably need to execute `bower install` here. ' + error);
    } else if (!enoentRe.test(errStr)) {
      logger.error(error);
    }

      // Returning default values
    return {
      components: [],
      aliases: [],
      order: []
    };
  });
};

const loadNpm = (config) => {
  return new Promise((resolve, reject) => {
    try {
      if (!config.npm.enabled) return resolve({components: []});
      mediator.npmIsEnabled = true;
      const paths = config.paths;
      const rootPath = sysPath.resolve(paths.root);
      const jsonPath = sysPath.join(rootPath, paths.packageConfig);
      let json;
      try {
        json = require(jsonPath);
      } catch (error) {
        return reject(new Error('You probably need to execute `npm install` to install brunch plugins. ' + error));
      }
      const items = Object.keys(json.dependencies || {}).filter(dep => {
        /* Ignore Brunch plugins. */
        return dep !== brunchPluginPattern &&
          dep.indexOf(brunchPluginPattern) === -1 && !normalizeChecker(config.conventions.ignored, dep);
      });
      return deppack.load(config, json, items).then(resolve, reject);
    } catch (e) {
      return reject(e);
    }
  });
};

const addPackageManagers = (config) => {
  return Promise.all([
    loadNpm(config),
    loadComponents(config, 'bower'),
    loadComponents(config, 'component')
  ]).then(components => {
    const norm = config._normalized.packageInfo;
    norm.npm = components[0];
    norm.bower = components[1];
    norm.component = components[2];
    return config;
  });
};

const tryToLoad = (configPath, fallbackHandler) => {
  let fullPath;
  let basename = configPath;
  return new Promise((resolve, reject) => {
    debug(`Trying to load ${configPath}`);
    let resolved;
    try {
      /* Assign fullPath in two steps in case require.resolve throws. */
      fullPath = sysPath.resolve(configPath);
      fullPath = require.resolve(fullPath);
      delete require.cache[fullPath];
      resolved = require(fullPath);
    } catch (e) {
      return reject(e);
    }
    basename = sysPath.basename(fullPath);
    return resolve(resolved);
  }).then(obj => {
    const config = obj.config || obj;
    if (!config) {
      return Promise.reject(new Error(`${basename} must be a valid object`));
    }
    if (!config.files) {
      return Promise.reject(new Error(`${basename} must have "files" property`));
    }
    return config;
  }).catch(error => {
    const isConfigRequireError = error.toString().indexOf(`'${fullPath}'`) !== -1;
    if (error.code === 'MODULE_NOT_FOUND' && isConfigRequireError) {
      if (!fallbackHandler) {
        fallbackHandler = () => {
          logger.error(`Couldn't load config ${basename}.js. Please create corresponding config or run brunch from the correct directory. ${error}`);
          process.exit(0);
        };
      }

      if (configPath === defaultConfigFilename) {
        return tryToLoad('config', fallbackHandler);
      }

      fallbackHandler();
    }
    return Promise.reject(error);
  });
};

exports.loadConfig = (persistent, opts) => {
  const configPath = opts.config || defaultConfigFilename;
  const options = initParams(persistent, opts) || {};
  return tryToLoad(configPath)
      .then(config => setConfigDefaults(config, configPath))
      .then(addDefaultServer)
      .then(warnAboutConfigDeprecations)
      .then(config => applyOverrides(config, options))
      .then(config => deepExtend(config, options))
      .then(replaceConfigSlashes)
      .then(normalizeConfig)
      .then(addPackageManagers)
      .then(deepFreeze);
};

/* Generate params that will be used as default config values.
 *
 * persistent - Boolean. Determines if brunch should run a web server.
 * options    - Object. {optimize, publicPath, server, port}.
 *
 * Returns Object.
 */

const initParams = (persistent, options) => {
  if (options.config != null) {
    logger.warn('`-c, --config` option is deprecated. ' +
      'Use `--env` and `config.overrides` instead');
  }
  if (options.optimize != null) {
    logger.warn('`-o, --optimize` option is deprecated. ' +
      'Use `-P, --production` instead');
  }

  const env = options.env;
  const params = {
    env: (env && env.split(',')) || []
  };
  if (options.production != null || options.optimize != null) {
    params.env.unshift('production');
  }
  params.persistent = persistent;
  params.stdin = options.stdin != null;
  if (options.publicPath) {
    params.paths = {};
    params.paths.public = options.publicPath;
  }
  if (persistent) {
    params.server = {};
    if (options.server) params.server.run = true;
    if (options.port) params.server.port = options.port;
  }
  return params;
};
