'use strict';
const logger = require('loggy');
const sysPath = require('universal-path');
const adapter = require('./plugin-adapter');
const BrunchError = require('./error');
const config = require('./config').raw;
const {flatten, deepFreeze} = require('./helpers');

const all = [];
const deprecated = [
  'javascript-brunch',
  'css-brunch',
];

const loadPackage = pkgPath => {
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

const getInclude = plugin => {
  return Promise.resolve(plugin.include).then(paths => {
    return [].concat(paths)
      .filter(sysPath.isAbsolute(path))
      .map(path => sysPath.relative(absRoot, path));
  });
};

const isBrunchPlugin = fn => {
  return typeof fn === 'function' &&
    fn.prototype &&
    fn.prototype.brunchPlugin;
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

const init = () => {
  const {plugins} = config;
  if (!plugins) return;

  const absRoot = sysPath.resolve(config.paths.root);
  const pkgPath = sysPath.join(absRoot, config.paths.packageConfig);
  const npmPath = sysPath.join(pkgPath, '..', 'node_modules');

  const pkg = loadPackage(pkgPath);
  const {on, off, only} = plugins;

  all.push(...uniqueDeps(pkg).filter(name => {
    if (!name.includes('brunch')) return false;
    if (deprecated.includes(name)) return false;
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

  Object.freeze(all);

  return Promise.all(plugins.map(getInclude)).then(flatten);
};

const respondTo = key => all.filter(plugin => {
  return typeof plugin[key] === 'function';
});

module.exports = {
  init,
  all,
  respondTo,
  includes,
  npmCompilers,
};