'use strict';
const exec = require('child_process').exec;
const os = require('os');
const sysPath = require('path');
const logger = require('loggy');
const SourceNode = require('source-map').SourceNode;
const readComponents = require('read-components');
const debug = require('debug')('brunch:helpers');
const commonRequireDefinition = require('commonjs-require-definition');
const anymatch = require('anymatch');
const mediator = require('./mediator');
const coffee = require('coffee-script');

coffee.register();

const defaultConfigFilename = 'brunch-config';
const defaultServerFilename = 'brunch-server';
const brunchPluginPattern = 'brunch';

/* Extends the object with properties from another object.
 * Example
 *
 *   extend {a: 5, b: 10}, {b: 15, c: 20, e: 50}
 *   # {a: 5, b: 15, c: 20, e: 50}
 */

const extend = exports.extend = (object, properties) => {
  Object.keys(properties).forEach(key => {
    return object[key] = properties[key];
  });
  return object;
};

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
    const ref1 = {
      on: 'off',
      off: 'on'
    };
    for (let k in ref1) {
      let v = ref1[k];
      if (plug && plug[v]) {
        if (overrideProps.plugins == null) overrideProps.plugins = {};
        overrideProps.plugins[v] = (overrideProps.plugins[v] || []).concat((config.plugins[v] || []).filter(plugin => {
          const list = overrideProps.plugins[k] || [];
          return list.indexOf(plugin) === -1;
        }));
      }
    }
    return deepExtend(config, overrideProps, config.files);
  });
  return config;
};

const deepExtend = (object, properties, rootFiles) => {
  if (rootFiles == null) {
    rootFiles = {};
  }
  const nestedObjs = Object.keys(rootFiles).map(_ => {
    return rootFiles[_];
  });
  Object.keys(properties).forEach(key => {
    const value = properties[key];
    if (toString.call(value) === '[object Object]' && nestedObjs.indexOf(object) === -1) {
      if (object[key] == null) {
        object[key] = {};
      }
      return deepExtend(object[key], value, rootFiles);
    } else {
      return object[key] = value;
    }
  });
  return object;
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

exports.formatError = (error, path) => {
  return error.code + " of '" + path + "' failed. " + (error.toString().slice(7));
};

const install = exports.install = (rootPath, command) => {
  const prevDir = process.cwd();
  logger.info("Installing " + command + " packages...");
  process.chdir(rootPath);

  return new Promise(function (resolve, reject) {
    exec(command + " install", (error, stdout, stderr) => {
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

let isWindows = exports.isWindows = os.platform() === 'win32';

const windowsStringReplace = (search, replacement) => {
  return _ => {
    if (isWindows && typeof _ === 'string') {
      return _.replace(search, replacement);
    } else {
      return _;
    }
  };
};

const replaceSlashes = exports.replaceSlashes = windowsStringReplace(/\//g, '\\');

const replaceBackSlashes = exports.replaceBackSlashes = windowsStringReplace(/\\/g, '\/');

const replaceConfigSlashes = exports.replaceConfigSlashes = config => {
  if (!isWindows) {
    return config;
  }
  const files = config.files || {};
  Object.keys(files).forEach(language => {
    const lang = files[language] || {};
    const order = lang.order || {};

    /* Modify order. */
    Object.keys(order).forEach(orderKey => {
      return lang.order[orderKey] = lang.order[orderKey].map(replaceSlashes);
    });

    /* Modify join configuration. */
    switch (toString.call(lang.joinTo).slice(8, -1)) {
      case 'String':
        lang.joinTo = replaceSlashes(lang.joinTo);
      case 'Object':
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
    const subConfig = Object.keys(joinTo).map(makeChecker).reduce(listToObj, {});
    return [types[index], subConfig];
  }).reduce(listToObj, {});

  const vendorRe = /vendor/i;

  /* special matching for plugin helpers */
  types.forEach(type => {
    const pluginHelpers = configFiles[type].pluginHelpers;
    joinConfig[type].pluginHelpers = Array.isArray(pluginHelpers) ? pluginHelpers : pluginHelpers ? [pluginHelpers] : (() => {
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
  });
  return Object.freeze(joinConfig);
};

const identityNode = exports.identityNode = (code, source) => {
  return new SourceNode(1, 0, null, code.split('\n').map((line, index) => {
    return new SourceNode(index + 1, 0, source, line + '\n');
  }));
};

const backslashRe = new RegExp('\\\\', 'g');
const dotRe = new RegExp('^(\.\.\/)*', 'g');

const cleanModuleName = exports.cleanModuleName = (path, nameCleaner) => {
  return nameCleaner(path.replace(backslashRe, '/').replace(dotRe, ''));
};

const wrapperRe = /\.\w+$/;
const amdRe = /define\s*\(/;

const getModuleWrapper = (type, nameCleaner) => {
  return (fullPath, data, isVendor) => {
    const sourceURLPath = cleanModuleName(fullPath, nameCleaner);
    const moduleName = sourceURLPath.replace(wrapperRe, '');
    const path = JSON.stringify(moduleName);
    if (isVendor) {
      debug("Not wrapping '" + path + "', is vendor file");
      return data;
    } else {
      debug("Wrapping '" + path + "' with " + type);

      /* Wrap in common.js require definition. */
      if (type === 'commonjs') {
        return {
          prefix: "require.register(" + path + ", function(exports, require, module) {\n",
          suffix: "});\n\n"
        };
      } else if (type === 'amd') {
        return {
          data: data.replace(amdRe, match => "" + match + path + ", ")
        };
      }
    }
  };
};

const normalizeWrapper = (typeOrFunction, nameCleaner) => {
  switch (typeOrFunction) {
    case 'commonjs':
      return getModuleWrapper('commonjs', nameCleaner);
    case 'amd':
      return getModuleWrapper('amd', nameCleaner);
    case false:
      return (path, data) => {
        return data;
      };
    default:
      if (typeof typeOrFunction === 'function') {
        return typeOrFunction;
      } else {
        throw new Error('config.modules.wrapper should be a function or one of: "commonjs", "amd", false');
      }
  }
};

const normalizeDefinition = typeOrFunction => {
  switch (typeOrFunction) {
    case 'commonjs':
      return () => {
        return commonRequireDefinition;
      };
    case 'amd':
    case false:
      return () => { return ''; };
    default:
      if (typeof typeOrFunction === 'function') {
        return typeOrFunction;
      } else {
        throw new Error('config.modules.definition should be a function or one of: "commonjs", false');
      }
  }
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

  if (paths["public"] == null) paths["public"] = joinRoot('public');
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
      return messages.push("config.paths." + path + " was removed, use config.paths.watched");
    }
  };
  const warnMoved = (configItem, from, to) => {
    if (configItem) {
      return messages.push("config." + from + " moved to config." + to);
    }
  };
  const ensureNotArray = name => {
    if (Array.isArray(config.paths[name])) {
      return messages.push("config.paths." + name + " can't be an array. Use config.conventions." + name);
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
  normalized.modules.wrapper = normalizeWrapper(mod.wrapper, config.modules.nameCleaner);
  normalized.modules.definition = normalizeDefinition(mod.definition);
  normalized.modules.autoRequire = mod.autoRequire;
  normalized.conventions = {};
  Object.keys(config.conventions).forEach(name => {
    return normalized.conventions[name] = normalizeChecker(config.conventions[name]);
  });
  normalized.paths = {};
  normalized.paths.possibleConfigFiles = Object.keys(require.extensions).map(_ => {
    return config.paths.config + _;
  }).reduce((obj, _) => {
    obj[_] = true;
    return obj;
  }, {});
  normalized.paths.allConfigFiles = [config.paths.packageConfig, config.paths.bowerConfig].concat(Object.keys(normalized.paths.possibleConfigFiles));
  normalized.packageInfo = {};
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
        if (err)
          return reject(err);
        return resolve({components: components, aliases: aliases});
      });
  }).then(o => {
      let components = o.components;
      let aliases = o.aliases;

      if (components == null) components = [];
      const order = components
        .sort((a, b) => {
          if (a.sortingLevel === b.sortingLevel) {
            return a.files[0] < b.files[0] ? -1 : 1;
          } else {
            return b.sortingLevel - a.sortingLevel;
          }
        })
        .reduce((flat, component) => {
          return flat.concat(component.files);
        }, []);
      return {
        components: components,
        aliases: aliases,
        order: order
      };
    }, error => {
      let errStr = error.toString();
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
        return reject(new Error("You probably need to execute `npm install` to install brunch plugins. " + error));
      }
      const items = Object.keys(json.dependencies || {}).filter(dep => {
        /* Ignore Brunch plugins. */
        return dep !== brunchPluginPattern &&
          dep.indexOf(brunchPluginPattern) === -1 && !normalizeChecker(config.conventions.ignored, dep);
      }).map(dep => {
        const depPath = sysPath.join(rootPath, 'node_modules', dep);
        let depJson = require(sysPath.join(depPath, 'package.json'));
        if (json.overrides != null ? json.overrides[dep] : undefined) {
          depJson = deepExtend(depJson, json.overrides[dep]);
        }
        const depMain = depJson.main || 'index.js';
        const file = sysPath.join('node_modules', dep, depMain);
        return {
          name: dep,
          files: [file],
          version: json.dependencies[dep]
        };
      });
      return resolve({components: items});
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
      config._normalized.packageInfo.npm = components[0];
      config._normalized.packageInfo.bower = components[1];
      config._normalized.packageInfo.component = components[2];
      return config;
    }
  );
};

exports.loadConfig = (configPath, options) => {
  if (configPath == null) configPath = defaultConfigFilename;
  if (options == null) options = {};
  let fullPath;

  return new Promise((resolve, reject) => {
    try {
      /* Assign fullPath in two steps in case require.resolve throws. */
      fullPath = sysPath.resolve(configPath);
      fullPath = require.resolve(fullPath);
      delete require.cache[fullPath];
      return resolve(require(fullPath));
    } catch (e) {
      return reject(e);
    }
  }).then(obj => {
    let config = obj.config || obj;
    if (!config) {
      throw new Error('Brunch config must be a valid object');
    }
    if (!config.files) {
      throw new Error('Brunch config must have "files" property');
    }
    return config;
  }).catch(error => {
    if (error.code === 'MODULE_NOT_FOUND') {
      logger.error("Couldn\'t load config " + sysPath.relative('.', fullPath) + ".{js,coffee}. Please create corresponding config or run brunch from the correct directory. " + error);
      process.exit(0);
    }
    return Promise.reject(error);
  })
      .then(config => {return setConfigDefaults(config, configPath)})
      .then(addDefaultServer)
      .then(warnAboutConfigDeprecations)
      .then(config => {return applyOverrides(config, options)})
      .then(config => {return deepExtend(config, options)})
      .then(replaceConfigSlashes)
      .then(normalizeConfig)
      .then(addPackageManagers)
      .then(deepFreeze);
};
