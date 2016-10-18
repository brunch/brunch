'use strict';
const debug = require('debug')('brunch:plugins');
const logger = require('loggy');
const profile = require('since-app-start').profile;
const flatten = require('./helpers').flatten;
const BrunchError = require('./error');
const adapter = require('./plugin-adapter');

const promisifyHook = ctx => new Promise(resolve => {
  if (ctx.preCompile.length === 1) {
    ctx.preCompile(resolve);
  } else {
    resolve(ctx.preCompile());
  }
});

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

const loadPackage = cwd => {
  profile('Loading plugins');

  try {
    const pkgPath = require.resolve(`${cwd}/package.json`);
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
    if (deps.hasOwnProperty(devDep)) {
      logger.warn(`You have declared ${devDep} in package.json more than once`);
    } else {
      names.push(devDep);
    }
  });

  return names;
};

/* Load brunch plugins, group them and initialise file watcher.
 *
 * options      - Object. {config[, optimize, server, port]}.
 * configParams - Object. Optional. Params will be set as default config items.
 * onCompile    - Function. Will be executed after each successful compilation.
 *
 * Returns nothing.
 */

const init = (config, onCompile, craDeps) => {
  profile('Loaded config');

  const cwd = process.cwd();
  const pkg = config.cra ? {dependencies: craDeps} : loadPackage(cwd);

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
      const Plugin = require(`${cwd}/node_modules/${name}`);
      if (Plugin && Plugin.prototype && Plugin.prototype.brunchPlugin) {
        const plugin = adapter(new Plugin(config));
        plugin.brunchPluginName = name;
        plugins.push(plugin);
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
    if (plugin.compileStatic && !plugin.staticTargetExtension) {
      logger.warn(`${plugin.brunchPluginName} does not declare target extension for static files, skipping.`);
      return false;
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

    // Finally, is it meant for either any environment or
    // an active environment?
    const env = plugin.defaultEnv;
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
    // Get plugins preCompile callbacks.
    return respondTo('preCompile')
      .concat(config.hooks)
      .map(promisifyHook);
  };

  // Get plugins onCompile callbacks.
  // Add onCompile callback from config.hooks and default Brunch callback.
  const callbacks = respondTo('onCompile')
    .map(plugin => plugin.onCompile.bind(plugin))
    .concat(config.hooks.onCompile, onCompile);

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
