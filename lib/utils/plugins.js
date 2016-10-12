'use strict';
const debug = require('debug')('brunch:plugins');
const logger = require('loggy');
const profile = require('since-app-start').profile;
const helpers = require('./helpers');
const BrunchError = require('./error');

const promisifyHook = ctx => new Promise((resolve, reject) => {
  if (ctx.preCompile.length === 1) {
    ctx.preCompile(resolve);
    return;
  }

  const promise = ctx.preCompile();
  if (promise && typeof promise.then === 'function') {
    promise.then(resolve, reject);
  } else {
    resolve();
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
  const includes = plugins.map(plugin => {
    const include = plugin.include;
    return typeof include === 'function' ?
      include.call(plugin) :
      include || [];
  });

  return Promise.all(helpers.flatten(includes));
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
  const names = [];

  const deps = pkg.dependencies || {};
  for (const dep of Object.keys(deps)) {
    names.push(dep);
  }

  const devDeps = pkg.devDependencies || {};
  for (const devDep of Object.keys(devDeps)) {
    if (devDep in deps) {
      logger.warn(`You have declared ${devDep} in package.json more than once`);
    } else {
      names.push(devDep);
    }
  }

  return names;
};

const reorder = (deps, order) => {
  return order.filter(name => {
    const declared = deps.includes(name);
    if (!declared) {
      logger.warn(`Plugin '${name}' is found in 'plugins.order', but is not declared in package.json`);
    }
    return declared;
  }).concat(deps).filter(helpers.dedupe);
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
  logger.notifications = config.notifications;
  logger.notificationsTitle = config.notificationsTitle;

  const cwd = process.cwd();
  const pkg = config.cra ? {dependencies: craDeps} : loadPackage(cwd);

  const on = config.plugins.on;
  const off = config.plugins.off;
  const only = config.plugins.only;
  const order = config.plugins.order;

  const deps = uniqueDeps(pkg).filter(name => {
    if (!name.includes('brunch')) return false;
    if (off.includes(name)) return false;
    if (only.length && !only.includes(name)) return false;
    return true;
  });

  const plugins = reorder(deps, order).reduce((plugins, name) => {
    try {
      const Plugin = require(`${cwd}/node_modules/${name}`);
      if (Plugin && Plugin.prototype && Plugin.prototype.brunchPlugin) {
        const plugin = new Plugin(config);
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
    // Get plugins preCompile callbacks.
    return respondTo('preCompile')
      .concat(config.hooks)
      .map(promisifyHook);
  };

  // Get plugins onCompile callbacks.
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
