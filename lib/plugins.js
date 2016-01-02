'use strict';
const sysPath = require('path');
const dbg = require('debug');
const debug = dbg('brunch:plugins');
const debugSpeed = dbg('brunch:speed');
const logger = require('loggy');

/* Worker must be loaded before fs_utils. */
const worker = require('./worker');
const fsUtils = require('./fs_utils');

const slice = [].slice;
const brunchPluginPattern = 'brunch'; // To filter brunch plugins.

const profileBrunch = (typeof global.profileBrunch === 'function') ?
  (item => debugSpeed(global.profileBrunch(item)))
  : Function.prototype;

/* Generate function that will check if object has property and it is a fn.
 * Returns Function.
 */
const propIsFunction = prop => obj => typeof obj[prop] === 'function';

const getPlugins = (packages, config) => {
  const exts = config.workers && config.workers.extensions;
  const isWorker = worker.isWorker;
  return packages
  .filter(plugin => {
    return plugin && plugin.prototype && plugin.prototype.brunchPlugin;
  })
  .filter(plugin => {
    if (isWorker && exts && exts.indexOf(plugin.prototype.extension) === -1) {
      return false;
    }
    return !isWorker || plugin.prototype.compile || plugin.prototype.lint;
  })
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
    if (context == null) context = this;
    return typeof thing === 'function' ? thing.call(context) : thing;
  };
  const ensureArray = object => Array.isArray(object) ? object : [object];
  return plugins
  .map(plugin => getValue(plugin.include, plugin))
  .filter(paths => paths != null)
  .reduce((acc, elem) => { return acc.concat(ensureArray(elem)); }, []);
};

const requireModule = (depPath, dependencyName) => {
  const plugin = require(depPath);
  profileBrunch('Loaded plugin ' + dependencyName);
  plugin.brunchPluginName = dependencyName;
  return plugin;
};

const loadPackages = (rootPath) => {
  profileBrunch('Loading plugins');
  rootPath = sysPath.resolve(rootPath);
  const nodeModules = rootPath + '/node_modules';
  let packagePath, json;
  try {
    packagePath = sysPath.join(rootPath, 'package.json');
    delete require.cache[require.resolve(packagePath)];
    json = require(packagePath);
  } catch (err) {
    throw new Error('Current directory is not brunch application root path, ' +
      `as it does not contain package.json (${err})`);
  }

  // Also need to test if `brunch-plugin` is in dep’s package.json.
  const loadDeps = (prop, isDev) => {
    const deps = Object.keys(prop || {});

    return deps.filter(dependency => {
      return dependency !== brunchPluginPattern &&
        dependency.indexOf(brunchPluginPattern) !== -1;
    }).map(dependency => {
      const depPath = nodeModules + '/' + dependency;
      if (isDev) {
        try {
          return requireModule(depPath, dependency);
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

  const plugins = loadDeps(json.dependencies);
  const devPlugins = loadDeps(json.devDependencies, true);
  const optPlugins = loadDeps(json.optionalDependencies, true);
  const allPlugins = plugins.concat(devPlugins, optPlugins);

  return allPlugins.filter(p => p != null);
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
  profileBrunch('Loaded config');
  logger.notifications = config.notifications;
  logger.notificationsTitle = config.notificationsTitle || 'Brunch';
  const black = config.plugins.off || [];
  const white = config.plugins.only || [];
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
  const alwaysP = config.plugins.on || [];
  const plugins = unfiltered.filter(plugin => {

    /* Backward compatibility for legacy optimizers. */
    if (typeof plugin.minify === 'function') {
      if (plugin.optimize == null) {
        plugin.optimize = plugin.minify;
      }
    }

    /* Does the user's config say this plugin should definitely be used? */
    if (alwaysP.length && alwaysP.indexOf(plugin.brunchPluginName) >= 0) {
      return true;
    }

    /* If the plugin is an optimizer that doesn't specify a defaultEnv
     * decide based on the config.optimize setting
     */
    if (plugin.optimize && !plugin.defaultEnv) {
      return config.optimize;
    }

    /* Use plugin-specified defaultEnv or assume it's meant for any env */
    if (plugin.defaultEnv == null) plugin.defaultEnv = '*';
    const env = plugin.defaultEnv;

    // Finally, is it meant for either any environment or
    // an active environment?
    return env === '*' || config.env.indexOf(env) >= 0;
  });
  debug('Loaded plugins: ' + (plugins.map(plugin => {
    return plugin.brunchPluginName;
  }).join(', ')));

  /* Get compilation methods. */
  const compilers = plugins.filter(propIsFunction('compile'));
  const linters = plugins.filter(propIsFunction('lint'));
  const optimizers = plugins.filter(propIsFunction('optimize'));
  const teardowners = plugins.filter(propIsFunction('teardown'));

  /* Get plugin preCompile callbacks. */
  const preCompilers = plugins.filter(propIsFunction('preCompile'))
  .map(plugin => {
    // => don't support arguments.
    return function() {
      let i = 2 <= arguments.length ? arguments.length - 1 : 0;
      const cb = arguments[i++];
      return plugin.preCompile(cb);
    };
  });

  /* Add preCompile callback from config. */
  if (typeof config.preCompile === 'function') {
    // => don't support arguments.
    preCompilers.push(function() {
      let i = 2 <= arguments.length ? arguments.length - 1 : 0;
      const cb = arguments[i++];
      return config.preCompile(cb);
    });
  }

  /* Get plugin onCompile callbacks. */
  const callbacks = plugins.filter(propIsFunction('onCompile'))
  .map(plugin => {
    return function() {
      const args = slice.call(arguments, 0);
      return plugin.onCompile.apply(plugin, args);
    };
  });

  /* Add onCompile callback from config. */
  if (typeof config.onCompile === 'function') {
    callbacks.push(config.onCompile);
  }

  /* Add default brunch callback. */
  callbacks.push(onCompile);
  const callCompileCallbacks = generatedFiles => {
    callbacks.forEach(cb => cb(generatedFiles));
  };
  const teardownBrunch = () => {
    teardowners.forEach(plugin => plugin.teardown());
  };
  if (worker.isWorker) {
    return {
      config: config,
      fileList: new fsUtils.FileList(config),
      compilers: compilers,
      linters: linters
    };
  }
  profileBrunch('Loaded plugins');
  return Promise.resolve({
    compilers: compilers,
    linters: linters,
    includes: getPluginIncludes(plugins),
    teardownBrunch: teardownBrunch,
    optimizers: optimizers,
    preCompilers: preCompilers,
    callCompileCallbacks: callCompileCallbacks
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
    let re = _patterns[ext];
    if (!re) re = _patterns[ext] = new RegExp('\\.' + ext + '$');
    return re;
  } else {
    return _neverMatchRe;
  }
};

exports.isPluginFor = path => {
  return plugin => _getPattern(plugin).test(path);
};
