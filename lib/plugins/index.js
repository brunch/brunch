'use strict';
const sysPath = require('universal-path');
const adapter = require('./adapter');
const {uniq, fs} = require('../utils');

const ignoredPlugins = [
  'javascript-brunch',
  'css-brunch',
];

const isBrunchPlugin = fn => {
  return typeof fn === 'function'
    && fn.prototype
    && fn.prototype.brunchPlugin;
};

module.exports = async config => {
  const {
    paths: {root: rootPath},
    plugins: {on, off, only},
  } = config;

  const byName = name => {
    return !name.startsWith('.')
      && name.includes('brunch')
      && name.includes('-')
      && !ignoredPlugins.includes(name)
      && !off.includes(name)
      && (!only.length || only.includes(name));
  };

  const requireAndNorm = (plugins, name) => {
    const Plugin = require(name);
    if (!isBrunchPlugin(Plugin)) return plugins;

    const plugin = new Plugin(config);
    Object.defineProperty(plugin, 'brunchPluginName', {
      value: name,
      configurable: true,
    });

    return [...plugins, adapter(plugin)];
  };

  const byEnv = plugin => {
    if (on.includes(plugin.brunchPluginName)) return true;

    const env = plugin.defaultEnv;
    if (env) return env === '*' || config.env.includes(env);
    if (typeof plugin.optimize === 'function') return config.optimize;

    return true;
  };

  const pkgPath = sysPath.join(rootPath, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath));
  const pluginNames = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
  });

  const plugins = pluginNames
    .filter(byName)
    .reduce(requireAndNorm, [])
    .filter(byEnv);

  return {
    get includes() {
      return (await Promise.all(plugins.map(plugin => plugin.include))
        .flat()
        .filter(path => path != null)
        .map(path => sysPath.relative(rootPath, path));

        Object.freeze(uniq(relative));
    },
    respondTo(key) {
      return plugins.filter(plugin => typeof plugin[key] === 'function');
    },
  },
};
