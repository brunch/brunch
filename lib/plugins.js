'use strict';
const sysPath = require('./path');
const debug = require('debug')('brunch:plugins');
const logger = require('loggy');
const profile = require('since-app-start').profile;
const flatten = require('./helpers').flatten;
const BrunchError = require('./error');

const isBrunchPlugin = dep => dep.name.includes('brunch');

const requireModule = dep => {
  const plugin = require(dep.path);
  profile(`Loaded plugin ${dep.name}`);
  plugin.brunchPluginName = dep.name;
  return plugin;
};

const pluginReducer = (plugins, dep) => {
  try {
    plugins.push(requireModule(dep));
  } catch (error) {
    if (dep.isMain) {
      throw new BrunchError('RUN_NPM_INSTALL', {error});
    } else {
      logger.warn(`Loading of ${dep.name} failed due to`, error);
    }
  }
  return plugins;
};

/* Get paths to files that plugins include. E.g. handlebars-brunch includes
 * `../vendor/handlebars-runtime.js` with path relative to plugin.
 *
 * plugins - Array of brunch plugins.
 *
 * Returns Array of Strings.
 */
const getIncludes = plugins => {
  const includes = plugins.map(plugin => {
    const include = plugin.include;
    if (typeof include === 'function') {
      const name = plugin.constructor.name;
      return include.call(plugin);
    }
    return include || [];
  });

  return Promise.all(flatten(includes));
};

const loadPackages = rootPath => {
  profile('Loading plugins');
  rootPath = sysPath.resolve(rootPath);

  try {
    const pkgPath = sysPath.join(rootPath, 'package.json');
    delete require.cache[require.resolve(pkgPath)];
    var pkg = require(pkgPath);
  } catch (error) {
    throw new BrunchError('CWD_INVALID', {error});
  }

  const uniqueDeps = deps => {
    const all = deps.map(obj => obj ? Object.keys(obj) : []);
    const main = all.shift();
    const other = flatten(all).reduce((other, name) => {
      if (main.includes(name)) {
        logger.warn(`You have declared ${name} in package.json more than once`);
      } else {
        other.push({name, isMain: false});
      }
      return other;
    }, []);

    return main.map(name => {
      return {name, isMain: true};
    }).concat(other).map(dep => {
      dep.path = `${rootPath}/node_modules/${dep.name}`;
      return dep;
    });
  };

  return uniqueDeps([
    pkg.dependencies,
    pkg.devDependencies,
    pkg.optionalDependencies,
  ]).filter(isBrunchPlugin).reduce(pluginReducer, []);
};

const getPlugins = (packages, config) => {
  return packages
    .filter(plugin => plugin && plugin.prototype && plugin.prototype.brunchPlugin)
    .map(Plugin => {
      const instance = new Plugin(config);
      instance.brunchPluginName = Plugin.brunchPluginName;
      return instance;
    });
};

/* Load brunch plugins, group them and initialise file watcher.
 *
 * options      - Object. {config[, optimize, server, port]}.
 * configParams - Object. Optional. Params will be set as default config items.
 * onCompile    - Function. Will be executed after each successful compilation.
 *
 * Returns nothing.
 */

const init = (config, onCompile) => {
  profile('Loaded config');
  logger.notifications = config.notifications;
  logger.notificationsTitle = config.notificationsTitle;
  const on = config.plugins.on;
  const off = config.plugins.off;
  const only = config.plugins.only;

  const packages = loadPackages('.').filter(plugin => {
    const name = plugin.brunchPluginName;
    if (off.includes(name)) return false;
    if (only.length && !only.includes(name)) return false;
    return true;
  });

  const plugins = getPlugins(packages, config).filter(plugin => {

    if (plugin.compileStatic && !plugin.staticTargetExtension) {
      logger.warn(`${plugin.brunchPluginName} does not declare target extension for static files, skipping.`);
      return false;
    }

    // Backward compatibility for legacy optimizers.
    if (typeof plugin.minify === 'function') {
      if (!plugin.optimize) plugin.optimize = plugin.minify;
    }

    // Does the user's config say this plugin should definitely be used?
    if (on.includes(plugin.brunchPluginName)) {
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
    return env === '*' || config.env.includes(env);
  });

  debug(`Loaded plugins:
    ${plugins.map(plugin => plugin.brunchPluginName).join(', ')}`
  );

  const respondTo = key => plugins.filter(plugin => {
    return typeof plugin[key] === 'function';
  });

  // Get compilation methods.
  const compilers = respondTo('compile');
  const staticCompilers = respondTo('compileStatic');
  const linters = respondTo('lint');
  const optimizers = respondTo('optimize');
  const teardowners = respondTo('teardown');

  const preCompilers = () => {
    // Get plugin preCompile callbacks.
    const preCompilerPromises = respondTo('preCompile').map(plugin => {
      return new Promise((resolve, reject) => {
        if (plugin.preCompile.length === 1) {
          plugin.preCompile(resolve);
        } else {
          const ret = plugin.preCompile();
          if (ret && typeof ret.then === 'function') {
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
      preCompilerPromises.push(new Promise((resolve, reject) => {
        if (config.hooks.preCompile.length === 1) {
          config.hooks.preCompile(resolve);
        } else {
          const ret = config.hooks.preCompile();
          if (ret && typeof ret.then === 'function') {
            ret.then(resolve, reject);
          } else {
            resolve();
          }
        }
      }));
    }
    return preCompilerPromises;
  };

  // Get plugin onCompile callbacks.
  const callbacks = respondTo('onCompile').map(plugin => function() {
    return plugin.onCompile.apply(plugin, arguments);
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

  profile('Loaded plugins');

  return getIncludes(plugins).then(includes => {
    return {
      compilers, staticCompilers, linters, includes, teardownBrunch,
      optimizers, preCompilers, callCompileCallbacks,
    };
  });
};

/* Generate function that will check if plugin can work with file.
 *
 * path   - Path to source file that can be compiled with plugin
 * plugin - Brunch plugin instance.
 *
 * Returns Function.
 */
const patternFor = (plugin, isStatic) => {
  const pattern = isStatic ?
    plugin.staticPattern || plugin.pattern :
    plugin.pattern;
  if (pattern) return pattern;

  const ext = isStatic ?
    plugin.staticExtension || plugin.extension :
    plugin.extension;
  if (ext) return new RegExp(`\\.${ext}$`);

  return /.^/; // never matches
};

const isPluginFor = (path, isStatic) => plugin => {
  return patternFor(plugin, isStatic).test(path);
};

module.exports = {
  init,
  patternFor,
  isPluginFor,
};
