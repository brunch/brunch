'use strict';
const debug = require('debug')('brunch:plugins');
const logger = require('loggy');
const profile = require('since-app-start').profile;
const flatten = require('./helpers').flatten;
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
  try {
    delete require.cache[pkgPath];
    return require(pkgPath);
  } catch (error) {
    throw new BrunchError('CWD_INVALID', {error});
  }
};

const uniqueDeps = pkg => {
  const deps = pkg.dependencies || {};
  const names = Object.keys(deps);
  const devDeps = pkg.devDependencies || {};

  Object.keys(devDeps).forEach(devDep => {
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

module.exports = (config, craDeps) => {
  profile('Loaded config');

  const absRoot = sysPath.resolve(config.paths.root);
  const pkgPath = sysPath.join(absRoot, config.paths.packageConfig);
  const npmPath = sysPath.join(absRoot, 'node_modules');

  const pkg = config.cra ? {dependencies: craDeps} : loadPackage(pkgPath);

  const on = config.plugins.on;
  const off = config.plugins.off;
  const only = config.plugins.only;

  const deps = uniqueDeps(pkg).filter(name => {
    if (!name.includes('brunch')) return false;
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
    const name = plugin.brunchPluginName;
    if (plugin.compileStatic && !plugin.staticTargetExtension) {
      logger.warn(`${name} does not declare target extension for static files, skipping.`);
      return false;
    }

    // Does the user's config say this plugin should definitely be used?
    if (on.includes(name)) {
      return true;
    }

    // If the plugin is an optimizer that doesn't specify a defaultEnv
    // decide based on the config.optimize setting
    const env = plugin.defaultEnv;
    if (env === '*') {
      return plugin.optimize ? config.optimize : true;
    }

    // Finally, is it meant for either any environment or
    // an active environment?
    return config.env.includes(env);
  });

  const names = plugins.map(plugin => plugin.brunchPluginName).join(', ');
  debug(`Loaded plugins: ${names}`);

  const respondTo = key => plugins.filter(plugin => {
    return typeof plugin[key] === 'function';
  });

  const hooks = {
    preCompile: respondTo('preCompile'),
    onCompile: respondTo('onCompile'),
    teardown: respondTo('teardown'),
  };

  return getIncludes(plugins).then(includes => {
    profile('Loaded plugins');

    const plugins = {
      includes,
      linters: respondTo('lint'),
      compilers: respondTo('compile'),
      staticCompilers: respondTo('compileStatic'),
      optimizers: respondTo('optimize'),
    };

    return {hooks, plugins};
  });
};
