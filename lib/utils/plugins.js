'use strict';
const debug = require('debug')('brunch:plugins');
const logger = require('loggy');
const {profile} = require('since-app-start');
const {flatten, deepFreeze} = require('./helpers');
const BrunchError = require('./error');
const adapter = require('./plugin-adapter');
const sysPath = require('universal-path');

const plugins = [];
const npmCompilers = [];
const ignoredPlugins = [
  'javascript-brunch',
  'css-brunch',
];

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

const isBrunchPlugin = fn => {
  return typeof fn === 'function' && fn.prototype && fn.prototype.brunchPlugin;
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

const init = config => {
  profile('Loaded config');

  const absRoot = sysPath.resolve(config.paths.root);
  const pkgPath = sysPath.join(absRoot, config.paths.packageConfig);
  const npmPath = sysPath.join(pkgPath, '..', 'node_modules');

  const pkg = loadPackage(pkgPath);
  const {off, only, on} = config.plugins;

  plugins.push(...uniqueDeps(pkg).filter(name => {
    if (!name.includes('brunch')) return false;
    if (ignoredPlugins.includes(name)) return false;
    if (off.includes(name)) return false;
    if (only.length && !only.includes(name)) return false;
    return true;
  }).reduce((plugins, name) => {
    try {
      const Plugin = require(sysPath.join(npmPath, name));
      if (isBrunchPlugin(Plugin)) {
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
  }, []).filter(plugin => {
    // Does the user's config say this plugin should definitely be used?
    if (on.includes(plugin.brunchPluginName)) return true;

    // If the plugin is an optimizer that doesn't specify a defaultEnv
    // decide based on the config.optimize setting
    const env = plugin.defaultEnv;
    if (!env) return plugin.optimize ? config.optimize : true;

    // Finally, is it meant for either any environment or an active environment?
    return env === '*' || config.env.includes(env);
  }));

  const compilers = respondTo('compile');
  npmCompilers.push(...compilers.map(compiler => {
    return config.npm.compilers.includes(compiler.brunchPluginName);
  }));

  Object.freeze(plugins);
  Object.freeze(npmCompilers);

  const names = plugins.map(plugin => plugin.brunchPluginName).join(', ');
  debug(`Loaded plugins: ${names}`);

  if (config.hot) {
    const hmrCompiler = compilers.find(compiler => {
      return compiler.brunchPluginName === 'auto-reload-brunch';
    });

    if (!hmrCompiler) throw new BrunchError('HMR_PLUGIN_MISSING');
    if (!hmrCompiler.supportsHMR) throw new BrunchError('HMR_PLUGIN_UNSUPPORTED');
  }

  const getIncludes = () => {
    const includes = plugins.map(plugin => {
      return plugin.include.then(paths => {
        return paths.filter(path => {
          if (sysPath.isAbsolute(path)) return true;

          logger.warn(
            'Relative paths in `include` are deprecated: use `__dirname`.',
            `Ignored ${path} @ ${plugin.brunchPluginName}.`
          );

          return false;
        }).map(path => sysPath.relative(absRoot, path));
      });
    });

    return Promise.all(includes).then(flatten);
  };

  return getIncludes().then(includes => {
    helpers.push(...includes);
    profile('Loaded plugins');

    return {
      preCompile: respondTo('preCompile'),
      onCompile: respondTo('onCompile'),
      teardown: respondTo('teardown'),
    };
  });
};

const respondTo = key => plugins.filter(plugin => {
  return typeof plugin[key] === 'function';
});

module.exports = {
  init,
  all: plugins,
  respondTo,
  includes,
  npmCompilers,
};
