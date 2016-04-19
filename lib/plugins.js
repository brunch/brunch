'use strict';
const sysPath = require('path');
const debug = require('debug')('brunch:plugins');
const logger = require('loggy');
const speed = require('since-app-start');

const slice = [].slice;
const brunchPluginPattern = 'brunch'; // To filter brunch plugins.

// Generate function that will check if object has property and it is a fn.
// Returns Function.
const propIsFunction = prop => obj => typeof obj[prop] === 'function';

const getPlugins = (packages, config) => {
  return packages
  .filter(plugin => plugin && plugin.prototype && plugin.prototype.brunchPlugin)
  .map(plugin => {
    const instance = new plugin(config);
    instance.brunchPluginName = plugin.brunchPluginName;
    return instance;
  });
};

/* Get paths to files that plugins include. E.g. handlebars-brunch includes
 * `../vendor/handlebars-runtime.js` with path relative to plugin.
 *
 * plugins - Array of brunch plugins.
 *
 * Returns Array of Strings.
 */
const getPluginIncludes = plugins => {
  const getValue = (thing, context) => {
    if (context === undefined) context = this;
    return typeof thing === 'function' ? thing.call(context) : thing;
  };
  const ensureArray = object => Array.isArray(object) ? object : [object];
  return plugins
  .map(plugin => getValue(plugin.include, plugin))
  .filter(paths => paths)
  .reduce((acc, elem) => { return acc.concat(ensureArray(elem)); }, []);
};

const cleanChildren = (mod) => {
  mod.children.forEach(cleanChildren);
  delete require.cache[mod.id];
};

const recursivelyResetModuleCache = depPath => {
  const id = require.resolve(depPath);
  if (id && id in require.cache) cleanChildren(require.cache[id]);
};

const requireModule = (depPath, dependencyName) => {
  const plugin = require(depPath);
  speed.profile('Loaded plugin ' + dependencyName);
  plugin.brunchPluginName = dependencyName;
  return plugin;
};

const loadPackages = (rootPath) => {
  speed.profile('Loading plugins');
  rootPath = sysPath.resolve(rootPath);
  const nodeModules = rootPath + '/node_modules';
  let json;
  try {
    const packagePath = sysPath.join(rootPath, 'package.json');
    delete require.cache[require.resolve(packagePath)];
    json = require(packagePath);
  } catch (err) {
    throw new Error('Current directory is not brunch application root path, ' +
      `as it does not contain package.json (${err})`);
  }

  // Also need to test if `brunch-plugin` is in dep’s package.json.
  const loadDeps = (prop, isDev) => {
    return prop.filter(dependency => {
      return dependency !== brunchPluginPattern &&
        dependency.indexOf(brunchPluginPattern) !== -1;
    }).map(dependency => {
      const depPath = nodeModules + '/' + dependency;
      if (isDev) {
        try {
          recursivelyResetModuleCache(depPath);
          return requireModule(depPath, dependency, true);
        } catch (error) {
          return null;
        }
      } else {
        try {
          return requireModule(depPath, dependency);
        } catch (error) {
          throw new Error('You probably need to execute `npm install` ' +
            'to install brunch plugins. ' + error);
        }
      }
    });
  };

  const uniqueDeps = function(/*mainDeps, ...otherDeps*/) {
    return slice.call(arguments, 0).map(deps => {
      return Object.keys(deps || {});
    }).map((dep, index, deps) => {
      if (index === 0) { return dep; }
      // return for mainDeps; filter otherDeps for finding plugins intersection with mainDeps.
      return dep.filter((dependency) => {
        const depUnique = deps[0].indexOf(dependency) === -1;
        if (!depUnique) {
          logger.warn(`You have declared ${dependency} in both dependencies and devDependencies`);
        }
        return depUnique;
      });
    });
  };

  return uniqueDeps(
    json.dependencies,
    json.devDependencies,
    json.optionalDependencies
  ).map((dependencies, index) => {
    return loadDeps(dependencies, index !== 0);
  }).reduce((acc, elem) => { return acc.concat(elem); }, []);
};

/* Load brunch plugins, group them and initialise file watcher.
 *
 * options      - Object. {config[, optimize, server, port]}.
 * configParams - Object. Optional. Params will be set as default config items.
 * onCompile    - Function. Will be executed after each successful compilation.
 *
 * Returns nothing.
 */

exports.init = (config, onCompile) => {
  speed.profile('Loaded config');
  logger.notifications = config.notifications;
  logger.notificationsTitle = config.notificationsTitle;
  const black = config.plugins.off;
  const white = config.plugins.only;
  const packages = loadPackages('.').filter(arg => {
    const brunchPluginName = arg.brunchPluginName;
    if (black.length && black.indexOf(brunchPluginName) >= 0) {
      return false;
    } else if (white.length && white.indexOf(brunchPluginName) === -1) {
      return false;
    } else {
      return true;
    }
  });
  const unfiltered = getPlugins(packages, config);
  const alwaysP = config.plugins.on;
  const plugins = unfiltered.filter(plugin => {

    // Backward compatibility for legacy optimizers.
    if (typeof plugin.minify === 'function') {
      if (!plugin.optimize) plugin.optimize = plugin.minify;
    }

    // Does the user's config say this plugin should definitely be used?
    if (alwaysP.length && alwaysP.indexOf(plugin.brunchPluginName) >= 0) {
      return true;
    }

    // If the plugin is an optimizer that doesn't specify a defaultEnv
    // decide based on the config.optimize setting
    if (plugin.optimize && !plugin.defaultEnv) {
      return config.optimize;
    }

    // Use plugin-specified defaultEnv or assume it's meant for any env.
    if (!plugin.defaultEnv) plugin.defaultEnv = '*';
    const env = plugin.defaultEnv;

    // Finally, is it meant for either any environment or
    // an active environment?
    return env === '*' || config.env.indexOf(env) >= 0;
  });
  debug('Loaded plugins: ' + (plugins.map(plugin => {
    return plugin.brunchPluginName;
  }).join(', ')));

  // Get compilation methods.
  const compilers = plugins.filter(propIsFunction('compile'));
  const linters = plugins.filter(propIsFunction('lint'));
  const optimizers = plugins.filter(propIsFunction('optimize'));
  const teardowners = plugins.filter(propIsFunction('teardown'));

  // Get plugin preCompile callbacks.
  const preCompilers = plugins.filter(propIsFunction('preCompile'))
  .map(plugin => {
    return new Promise((resolve, reject) => {
      if (plugin.preCompile.length === 1) {
        plugin.preCompile(resolve);
      } else {
        const ret = plugin.preCompile();
        if (ret && ret.then) {
          ret.then(resolve, reject);
        } else {
          resolve();
        }
      }
    });
  });

  // Add preCompile callback from config.
  if (typeof config.hooks.preCompile === 'function') {
    // => don't support arguments.
    preCompilers.push(new Promise((resolve, reject) => {
      if (config.preCompile.length === 1) {
        config.preCompile(resolve);
      } else {
        const ret = config.preCompile();
        if (ret && ret.then) {
          ret.then(resolve, reject);
        } else {
          resolve();
        }
      }
    }));
  }

  // Get plugin onCompile callbacks.
  const callbacks = plugins.filter(propIsFunction('onCompile'))
  .map(plugin => {
    return function() {
      const args = slice.call(arguments, 0);
      return plugin.onCompile.apply(plugin, args);
    };
  });

  // Add onCompile callback from config.hooks.
  if (typeof config.hooks.onCompile === 'function') {
    callbacks.push(config.hooks.onCompile);
  }

  // Add default brunch callback.
  callbacks.push(onCompile);
  const callCompileCallbacks = (generatedFiles, changedAssets) => {
    callbacks.forEach(cb => cb(generatedFiles, changedAssets));
  };
  const teardownBrunch = () => {
    teardowners.forEach(plugin => plugin.teardown());
  };
  speed.profile('Loaded plugins');
  const includes = getPluginIncludes(plugins);
  return Promise.resolve({
    compilers, linters, includes, teardownBrunch, optimizers,
    preCompilers, callCompileCallbacks
  });
};

/* Generate function that will check if plugin can work with file.
 *
 * path   - Path to source file that can be compiled with plugin
 * plugin - Brunch plugin instance.
 *
 * Returns Function.
 */

const _patterns = {};
const _neverMatchRe = /$0^/;
const _getPattern = plugin => {
  const ext = plugin.extension;
  if (plugin.pattern) {
    return plugin.pattern;
  } else if (ext) {
    const re = _patterns[ext] || (_patterns[ext] = new RegExp('\\.' + ext + '$'));
    return re;
  } else {
    return _neverMatchRe;
  }
};

exports.isPluginFor = path => {
  return plugin => _getPattern(plugin).test(path);
};
