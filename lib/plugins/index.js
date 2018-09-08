'use strict';
const fs = require('fs');
const sysPath = require('universal-path');
// const adapter = require('./adapter');
const adapter = p => p;
const config = require('../config');
const {on, off, only} = config.plugins;
const {co, flat, uniq} = require('../utils');

const blacklist = [
  'brunch',
  'javascript-brunch',
  'css-brunch',
];

const byName = name => {
  return name.includes('brunch') &&
    !blacklist.includes(name) &&
    !name.startsWith('.') &&
    !off.includes(name) &&
    (!only.length || only.includes(name));
};

const isBrunchPlugin = fn => {
  return typeof fn === 'function' &&
    fn.prototype &&
    fn.prototype.brunchPlugin;
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
  if (!env) {
    return typeof plugin.optimize === 'function' ?
      config.optimize :
      true;
  }

  return env === '*' || config.env.includes(env);
};

const npmDir = sysPath.join(config.paths.root, 'node_modules');
const plugins = exports.plugins = Object.freeze(
  fs.readdirSync(npmDir)
    .filter(byName)
    .reduce(requireAndNorm, [])
    .filter(byEnv)
);

exports.respondTo = key => {
  return plugins.filter(plugin => typeof plugin[key] === 'function');
};

exports.includes = (async () => {
  const promises = plugins.map(plugin => plugin.include);
  const includes = flat(await Promise.all(promises));
  const relative = includes
    .filter(path => path != null)
    .map(path => sysPath.relative(config.paths.root, `${path}`));

  return Object.freeze(uniq(relative));
})();
