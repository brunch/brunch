'use strict';
const debug = require('./debug')('brunch:plugins');
const logger = require('loggy');
const profile = require('since-app-start').profile;
const flatten = require('./helpers').flatten;
const deepFreeze = require('./helpers').deepFreeze;
const BrunchError = require('./error');
const adapter = require('./plugin-adapter');
const sysPath = require('universal-path');

/* Get paths to files that plugins include. E.g. handlebars-brunch includes
 * `../vendor/handlebars-runtime.js` with path relative to plugin.
 *
 * plugins - Array of brunch plugins.
 *
 * Returns Array of Strings.
 */
const getIncludes = plugins => {
  const includes = plugins.map(plugin => plugin.include);
  return Promise.all(flatten(includes));
};

const loadPackage = pkgPath => {
  profile('Loading plugins');
  const clearCache = () => delete require.cache[pkgPath];

  try {
    clearCache();
    const pkg = require(pkgPath);
    if (!pkg.dependencies) pkg.dependencies = {};
    if (!pkg.devDependencies) pkg.devDependencies = {};

    return deepFreeze(pkg);
  } catch (error) {
    throw new BrunchError('CWD_INVALID', {error});
  } finally {
    clearCache();
  }
};

const uniqueDeps = pkg => {
  const deps = pkg.dependencies;
  const names = Object.keys(deps);

  Object.keys(pkg.devDependencies).forEach(devDep => {
    if (devDep in deps) {
      logger.warn(`You have declared ${devDep} in package.json more than once`);
    } else {
      names.push(devDep);
    }
  });

  return names;
};

/* Load brunch plugins, group them and initialise file watcher.
 *
 * configParams - Object. Optional. Params will be set as default config items.
 *
 */

const plugins = (config, craDeps) => {
  profile('Loaded config');

  const absRoot = sysPath.resolve(config.paths.root);
  const pkgPath = sysPath.join(absRoot, config.paths.packageConfig);
  const npmPath = sysPath.join(absRoot, 'node_modules');

  const pkg = config.cra ? {dependencies: craDeps} : loadPackage(pkgPath);

  const on = config.plugins.on;
  const off = config.plugins.off;
  const only = config.plugins.only;

  const deps = uniqueDeps(pkg).filter(name => {
    if (name === 'javascript-brunch' || !name.includes('brunch')) return false;
    if (off.includes(name)) return false;
    if (only.length && !only.includes(name)) return false;
    return true;
  });

  const plugins = deps.reduce((plugins, name) => {
    try {
      const Plugin = require(sysPath.join(npmPath, name));
      if (Plugin && Plugin.prototype && Plugin.prototype.brunchPlugin) {
        const plugin = new Plugin(config);
        plugin.brunchPluginName = name;
        plugins.push(adapter(plugin));
      }
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND' && name in pkg.dependencies) {
        throw new BrunchError('RUN_NPM_INSTALL', {error});
      }
      logger.warn(`Loading of ${name} failed due to`, error);
    }
    return plugins;
  }, [])
  .filter(plugin => {
    // Does the user's config say this plugin should definitely be used?
    if (on.includes(plugin.brunchPluginName)) {
      return true;
    }

    // If the plugin is an optimizer that doesn't specify a defaultEnv
    // decide based on the config.optimize setting
    const env = plugin.defaultEnv;
    if (!env) {
      return plugin.optimize ? config.optimize : true;
    }

    // Finally, is it meant for either any environment or
    // an active environment?
    return env === '*' || config.env.includes(env);
  });

  const respondTo = key => plugins.filter(plugin => {
    return typeof plugin[key] === 'function';
  });

  const compilers = respondTo('compile');
  const names = plugins.map(plugin => plugin.brunchPluginName).join(', ');
  debug(`Loaded plugins: ${names}`);

  if (config.hot) {
    const hmrCompiler = compilers.find(compiler => {
      return compiler.brunchPluginName === 'auto-reload-brunch';
    });

    if (!hmrCompiler) throw new BrunchError('HMR_PLUGIN_MISSING');
    if (!hmrCompiler.supportsHMR) throw new BrunchError('HMR_PLUGIN_UNSUPPORTED');
  }

  return getIncludes(plugins).then(includes => {
    plugins.helpers = includes;
    profile('Loaded plugins');

    return {
      hooks: {
        preCompile: respondTo('preCompile'),
        onCompile: respondTo('onCompile'),
        teardown: respondTo('teardown'),
      },
      plugins: {
        includes,
        compilers,
        optimizers: respondTo('optimize'),
        all: plugins,
      },
    };
  });
};

plugins.helpers = [];
module.exports = plugins;
