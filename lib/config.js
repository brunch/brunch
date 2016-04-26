'use strict';
const fs = require('fs');
const sysPath = require('path');
const exec = require('child_process').exec;
const logger = require('loggy');
const readComponents = require('read-components');
const anymatch = require('anymatch');
const coffee = require('coffee-script');
const debug = require('debug')('brunch:config');
const deepAssign = require('deep-assign');

const deppack = require('deppack'); // isNpm
const loadInit = deppack.loadInit;
const mdls = require('./modules');

const skemata = require('skemata');

const _helpers = require('./helpers');
const isWindows = _helpers.isWindows;
const replaceSlashes = _helpers.replaceSlashes;

coffee.register();

const mediator = {};
const defaultConfigFilename = 'brunch-config';
const defaultServerFilename = 'brunch-server';

const v = skemata.v;
const defaultPort = 3333;
const defaultInterval = 65;
const configBaseSchema = v.object({
  paths: v.object({
    root: v.string.default('.'),
    public: v.string.default('public'),
    watched: v.array(v.string).default(['app', 'test', 'vendor']),
    ignored: v.deprecated(v.noop, 'moved to `config.conventions.ignored`'),
    assets: v.deprecated(v.noop, 'moved to `config.conventions.assets`'),
    test: v.deprecated(v.noop, 'moved to `config.conventions.test`'),
    vendor: v.deprecated(v.noop, 'moved to `config.conventions.vendor`'),
    config: v.string,
    packageConfig: v.string.default('package.json'),
    bowerConfig: v.string.default('bower.json')
  }).default({}),

  rootPath: v.deprecated(v.noop, 'moved to `config.paths.root`'),
  buildPath: v.deprecated(v.noop, 'moved to `config.paths.public`'),

  files: v.objects({
    keys: ['javascripts', 'templates', 'stylesheets'],
    warner: key => {
      if (['app', 'test', 'vendor', 'assets'].indexOf(key) !== -1) {
        return 'was removed, use `config.paths.watched` instead';
      }
    }
  }, v.object({
    joinTo: v.either(
      v.string,
      v.objects({}, v.anymatch)
    ),
    entryPoints: v.objects({}, v.either(v.string, v.objects({}, v.anymatch))),
    order: v.object({
      before: v.anymatch,
      after: v.anymatch
    }),
    pluginHelpers: v.either(v.string, v.array(v.string)),
    defaultPaths: v.deprecated(v.noop, 'was removed'),
    defaultExtensions: v.deprecated(v.noop, 'was removed')
  })),

  npm: v.object({
    enabled: v.bool.default(true),
    globals: v.objects({}, v.string),
    styles: v.objects({}, v.array(v.string)),
    static: v.array(v.string).default([])
  }).default({}),

  plugins: v.object({
    on: v.array(v.string).default([]),
    off: v.array(v.string).default([]),
    only: v.array(v.string).default([])
  }, false).default({}),

  conventions: v.object({
    ignored: v.anymatch.default([/[\\\/]_/, /vendor[\\\/](node|j?ruby-.*|bundle)[\\\/]/]),
    assets: v.anymatch.default(/assets[\\\/]/),
    vendor: v.anymatch.default(/(^bower_components|node_modules|vendor)[\\\/]/)
  }).default({}),

  modules: v.object({
    wrapper: v.either(v.enum('commonjs', 'amd', false), v.function).default('commonjs'),
    definition: v.either(v.enum('commonjs', 'amd', false), v.function).default('commonjs'),
    autoRequire: v.objects({}, v.array(v.string)).default({}),
    nameCleaner: v.function.default(path => path.replace(/^app\//, ''))
  }).default({}),

  notifications: v.bool.default(true),
  notificationsTitle: v.string.default('Brunch'),

  optimize: v.bool.default(false),
  sourceMaps: v.either(v.bool, v.enum('old', 'absoluteUrl')).default(true),

  server: v.object({
    base: v.string.default(''),
    port: v.int.default(defaultPort),
    run: v.bool.default(false),
    hostname: v.string.default('localhost'),
    indexPath: v.string.default('index.html'),
    noPushState: v.bool.default(false),
    noCors: v.bool.default(false),
    stripSlashes: v.bool.default(false),
    path: v.string,
    command: v.string
  }).default({}),

  fileListInterval: v.int.default(defaultInterval),

  watcher: v.object({
    usePolling: v.bool.default(false)
  }).default({}),

  hooks: v.object({
    onCompile: v.function,
    preCompile: v.function
  }).default({}),

  onCompile: v.deprecated(v.function, 'use `config.hooks.onCompile` instead'),
  preCompile: v.deprecated(v.function, 'use `config.hooks.preCompile` instead')
});

const overrideSchema = v.merge(configBaseSchema, v.object({}), { ignoreFirstDefaults: true });
const productionOverrideSchema = v.merge(
  configBaseSchema,
  v.object({
    optimize: v.bool.default(true),
    sourceMaps: v.either(v.bool, v.enum('old', 'absoluteUrl')).default(false),
    overrides: v.deprecated(v.noop, "can't define 'overrides' inside an override"),

    plugins: v.object({
      autoReload: v.object({
        enabled: v.bool.default(false)
      }).default({})
    }).default({})
  }),
  { ignoreFirstDefaults: true }
).default({});

const configSchema = v.merge(
  configBaseSchema,
  v.object({
    overrides: v.objects({ specifics: { production: productionOverrideSchema } }, overrideSchema).default({})
  })
);

const validateConfig = config => {
  const res = configSchema(config);
  const fmt = skemata.formatObject(res, 'config');
  if (fmt && fmt.errors.length > 0) {
    fmt.errors.forEach(error => {
      logger.error(`${error.path}: ${error.result}`);
    });
  }
  if (fmt && fmt.warnings.length > 0) {
    fmt.warnings.forEach(warn => {
      logger.warn(`${warn.path}: ${warn.warning}`);
    });
  }
  if (!res.ok) {
    throw new Error('config is not valid');
  }
  return config;
};

const checkNpmModules = config => {
  if (config.npm.enabled && config.modules.definition !== 'commonjs' && config.modules.wrapper !== 'commonjs') {
    throw new Error(`can't use npm integration with non-CommonJS modules format (current: '${config.modules.definition}'/'${config.modules.wrapper})'. Either set 'config.modules.definition' and 'config.modules.wrapper' to 'commonjs' or disable npm integration ('config.npm.enabled = false')`);
  }
  return config;
};

const customDeepAssign = (object, properties, files) => {
  const nestedObjs = Object.keys(files).map(file => files[file]);
  const dontMerge = nestedObjs.indexOf(object) !== -1;
  Object.keys(properties).forEach(key => {
    const value = properties[key];
    if (toString.call(value) === '[object Object]' && !dontMerge) {
      if (object[key] == null) object[key] = {};
      customDeepAssign(object[key], value, files);
    } else {
      if (dontMerge) {
        // if either joinTo or entryPoints is overriden but not both, reset the other, as they are supposed to go hand-in-hand
        const otherKey = key === 'joinTo' ? 'entryPoints' : key === 'entryPoints' ? 'joinTo' : null;
        if (otherKey && otherKey in object && !(otherKey in properties)) {
          delete object[otherKey];
        }
      }
      object[key] = value;
    }
  });
  return object;
};

const specials = {on: 'off', off: 'on'};
const applyOverrides = (config, options) => {

  // Allow the environment to be set from environment variable.
  config.env = options.env;
  const environments = options.env;
  if (process.env.BRUNCH_ENV) {
    environments.unshift(process.env.BRUNCH_ENV);
  }

  // Preserve default config before overriding.
  if (environments.length && 'overrides' in config) {
    config.overrides._default = {};
    Object.keys(config).forEach(prop => {
      const isObject = toString.call(config[prop]) === '[object Object]';
      if (prop === 'overrides' || !isObject) {
        return;
      }
      config.overrides._default[prop] = {};
      deepAssign(config.overrides._default[prop], config[prop]);
    });
  }
  environments.forEach(override => {
    const plug = config.plugins;
    const overrideProps = (config.overrides && config.overrides[override]) || {};

    // Special override handling for plugins.on|off arrays (gh-826).
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
    customDeepAssign(config, overrideProps, config.files);
  });
  // ensure server's public path takes overrides into account
  config.server.publicPath = config.paths.public;
  return config;
};

const deepFreeze = object => {
  Object.keys(Object.freeze(object))
    .map(key => object[key] && object[key] !== object.static)
    .filter(value => {
      return value && typeof value === 'object' && !Object.isFrozen(value);
    })
    .forEach(deepFreeze);
  return object;
};

exports.install = (rootPath, command, isProduction) => {
  const prevDir = process.cwd();
  logger.info('Installing ' + command + ' packages...');
  process.chdir(rootPath);

  const cmd = command + ' install' + (isProduction ? ' --production' : '');

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      process.chdir(prevDir);
      if (error) {
        const log = stderr.toString();
        logger.error(log);
        return reject(log);
      }
      resolve(stdout);
    });
  });
};

const replaceConfigSlashes = exports.replaceConfigSlashes = config => {
  if (!isWindows) return config;

  const slashifyJoinTo = joinTo => {
    switch (toString.call(joinTo)) {
      case '[object String]':
        return replaceSlashes(joinTo);
      case '[object Object]':
        return Object.keys(joinTo).reduce((newJoinTo, joinToKey) => {
          newJoinTo[replaceSlashes(joinToKey)] = joinTo[joinToKey];
          return newJoinTo;
        }, {});
    }
  };

  const files = config.files || {};
  Object.keys(files).forEach(language => {
    const lang = files[language] || {};
    const order = lang.order || {};

    // Modify order.
    Object.keys(order).forEach(orderKey => {
      return lang.order[orderKey] = lang.order[orderKey].map(replaceSlashes);
    });

    Object.keys(lang.entryPoints || {}).forEach(entry => {
      const val = lang.entryPoints[entry];
      const newEntry = replaceSlashes(entry);
      const newVal = slashifyJoinTo(val);

      delete lang.entryPoints[entry];
      lang.entryPoints[newEntry] = newVal;
    });

    // Modify join configuration.
    lang.joinTo = slashifyJoinTo(lang.joinTo);
  });
  return config;
};


// Config items can be a RegExp or a function.  The function makes universal API to them.
// Takes RegExp or Function
// Returns Function.
const normalizeChecker = anymatch;

const normalizeJoinConfig = joinTo => {
  // Can be used in `reduce` as `array.reduce(listToObj, {})`.
  const listToObj = (acc, elem) => {
    acc[elem[0]] = elem[1];
    return acc;
  };

  const object = (typeof joinTo === 'string') ? {[joinTo]: /.+/} : joinTo;
  const makeChecker = generatedFilePath => {
    return [generatedFilePath, normalizeChecker(object[generatedFilePath])];
  };
  const subCfg = Object.keys(object).map(makeChecker).reduce(listToObj, {});
  return subCfg;
};

const normalizePluginHelpers = (items, subCfg) => {
  const vendorRe = /vendor/i;
  if (!subCfg) return;
  if (!items) {
    items = (() => {
      const destFiles = Object.keys(subCfg);
      const joinMatch = destFiles.find(file => subCfg[file]('vendor/.'));
      if (joinMatch) return [joinMatch];
      const nameMatch = destFiles.find(file => vendorRe.test(file));
      if (nameMatch) return [nameMatch];
      return [destFiles[0]];
    })();
  }
  if (!Array.isArray(items)) items = [items];
  return items;
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
const createJoinConfig = (configFiles, paths) => {
  const types = Object.keys(configFiles);

  const joinConfig = types.map(type => configFiles[type].joinTo)
    .map(joinTo => joinTo || {})
    .map(normalizeJoinConfig)
    .reduce((cfg, subCfg, index) => {
      cfg[types[index]] = subCfg;
      return cfg;
    }, {});

  // special matching for plugin helpers
  types.forEach(type => {
    const items = configFiles[type].pluginHelpers;
    const subCfg = joinConfig[type];
    subCfg.pluginHelpers = normalizePluginHelpers(items, subCfg);
  });

  const entryPoints = {};

  // the joinTo is just a special case of entryPoints
  types.forEach(type => {
    entryPoints[type] = {};
    if (joinConfig[type]) entryPoints[type]['*'] = joinConfig[type];
  });

  const outPaths = [];
  types.forEach(type => {
    const fileCfg = configFiles[type];
    if (fileCfg.entryPoints) {
      if (type !== 'javascripts') {
        logger.warn(`entryPoints can only be used with 'javascripts', not '${type}'`);
        return;
      }

      Object.keys(fileCfg.entryPoints).forEach(target => {
        const isTargetWatched = paths.watched.some(path => target.indexOf(path + '/') === 0);
        if (!isTargetWatched) {
          logger.warn(`The correct use of entry points is: \`'entryFile.js': 'outputFile.js'\`. You are trying to use '${target}' as an entry point, but it is probably an output file.`);
        }
        const outFiles = Object.keys(fileCfg.entryPoints[target]);
        if (outFiles.some(out => joinConfig[type][out])) {
          logger.warn(`config.files.${type}.joinTo is already defined for '${target}', can't add an entry point`);
          return;
        }
        const entryCfg = fileCfg.entryPoints[target];
        const normalizedEntryCfg = normalizeJoinConfig(entryCfg);

        Object.keys(normalizedEntryCfg).forEach(path => {
          if (outPaths.indexOf(path) !== -1) {
            logger.warn(`'${path}' is already used by another entry point, can't add it to config.files.${type}.entryPoints for '${target}'`);
            delete normalizedEntryCfg[path];
            return;
          }

          outPaths.push(path);
        });
        entryPoints[type][target] = normalizedEntryCfg;
      });
    }
  });

  return Object.freeze(entryPoints);
};

const setConfigDefaults = exports.setConfigDefaults = (config, configPath) => {
  const join = (parent, name) => {
    return sysPath.join(config.paths[parent], name);
  };
  const joinRoot = name => {
    return join('root', name);
  };

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
  const normalized = {};
  normalized.join = createJoinConfig(config.files, config.paths);
  const mod = config.modules;
  normalized.modules = {};
  normalized.modules.wrapper = mdls.normalizeWrapper(mod.wrapper, config.modules.nameCleaner);
  normalized.modules.definition = mdls.normalizeDefinition(mod.definition);
  normalized.modules.autoRequire = mod.autoRequire;
  normalized.conventions = {};
  Object.keys(config.conventions).forEach(name => {
    const fn = normalizeChecker(config.conventions[name]);
    if (name === 'assets') {
      normalized.conventions[name] = x => {
        return deppack.isNpm(x) ? false : fn(x);
      };
    } else {
      normalized.conventions[name] = fn;
    }
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
  normalized.isProduction = mediator.isProduction;
  config._normalized = normalized;
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
    // Do nothing.
  }
  return config;
};

const enoentRe = /ENOENT/;
const loadComponents = (config, type) => {
  // Since readComponents call its callback with many arguments, we hate to wrap it manually
  return new Promise((resolve, reject) => {
    readComponents('.', type, (err, components) => {
      if (err) return reject(err);

      return resolve({components});
    });
  }).then(o => {
    const components = o.components || [];
    const order = components
      .sort((a, b) => {
        if (a.sortingLevel === b.sortingLevel) {
          return a.files[0] < b.files[0] ? -1 : 1;
        } else {
          return b.sortingLevel - a.sortingLevel;
        }
      })
      .reduce(((flat, component) => flat.concat(component.files)), []);
    return {components, order};
  }, error => {
    const errStr = error.toString();
    if (error.code === 'NO_BOWER_JSON') {
      logger.error('You probably need to execute `bower install` here.', error);
    } else if (!enoentRe.test(errStr)) {
      logger.error(error);
    }

      // Returning default values
    return {components: [], aliases: [], order: []};
  });
};

const loadNpm = (config) => {
  return new Promise((resolve, reject) => {
    try {
      const paths = config.paths;
      const rootPath = sysPath.resolve(paths.root);
      const jsonPath = sysPath.join(rootPath, paths.packageConfig);
      let json;
      try {
        json = require(jsonPath);
      } catch (error) {
        let message;
        if (error.message.indexOf('Cannot find module') !== -1) {
          message = "No package.json was found. That's where brunch plugins need to be listed. Plugins tell Brunch how to compile your files, so without any plugins Brunch won't know what to do. To get started, run `npm init` to generate a package.json file and `npm install --save javascript-brunch css-brunch` to install and save plugins for regular JS and CSS.";
        } else if (error.message.indexOf('SyntaxError:') !== -1 || error.message.indexOf('Unexpected end of input') !== -1) {
          message = `package.json has invalid syntax (${error.message})`;
        }
        if (message) {
          return reject(new Error(message));
        } else {
          return reject(error);
        }
      }
      return loadInit(config, json).then(resolve, reject);
    } catch (e) {
      return reject(e);
    }
  });
};

const checkComponents = (config) => {
  return new Promise(resolve => {
    const path = sysPath.resolve(sysPath.join(config.paths.root, 'component.json'));
    fs.exists(path, exists => {
      if (exists) {
        logger.warn('Detected component.json in project root. Component.json is no longer supported. You could switch to keeping dependencies in NPM (package.json), or revert to Brunch 2.2.');
      }
      resolve();
    });
  });
};

const addPackageManagers = (config) => {
  return Promise.all([
    loadNpm(config),
    loadComponents(config, 'bower'),
    checkComponents(config)
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
  return new Promise((resolve, reject) => {
    debug(`Trying to load ${configPath}`);
    let resolved;
    try {
      // Assign fullPath in two steps in case require.resolve throws.
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
    if (!('files' in config)) {
      return Promise.reject(new Error(`${basename} must have "files" property. Here's a minimal brunch-config.js to get you started:\n${minimalConfig}`));
    }
    return config;
  }).catch(error => {
    const isConfigRequireError = error.toString().indexOf(`'${fullPath}'`) !== -1;
    if (error.code === 'MODULE_NOT_FOUND' && isConfigRequireError) {
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
    }
    error.code = 'BRSYNTAX';
    error.message = 'Failed to load brunch config - ' + error.message;
    return Promise.reject(error);
  });
};

exports.loadConfig = (persistent, opts, fromWorker) => {
  const noop = (config) => config;
  const configPath = opts.config || defaultConfigFilename;
  const options = initParams(persistent, opts) || {};
  return tryToLoad(configPath)
    .then(validateConfig)
    .then(checkNpmModules)
    .then(config => setConfigDefaults(config, configPath))
    .then(fromWorker ? noop : addDefaultServer)
    .then(config => applyOverrides(config, options))
    .then(config => deepAssign(config, options))
    .then(replaceConfigSlashes)
    .then(normalizeConfig)
    .then(fromWorker ? noop : addPackageManagers)
    .then(deepFreeze);
};

// workerk don't need default server, deprecation warnings, or package manager support
exports.loadConfigWorker = (persistent, opts) => {
  return exports.loadConfig(persistent, opts, true);
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
    mediator.isProduction = true;
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
