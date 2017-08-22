'use strict';
const fs = require('fs');
const sysPath = require('universal-path');
const adapter = require('./adapter');
const config = require('../config');
const {on, off, only} = config.plugins;
const {co, flat, uniq} = require('../utils');

const deprecated = [
  'javascript-brunch',
  'css-brunch',
];

const getDeps = () => {
  const npmDir = sysPath.join(config.paths.root, 'node_modules');

  return fs.readdirSync(npmDir)
    .filter(name => !name.startsWith('.'));
};

const byName = name => {
  return name.includes('brunch') &&
    !deprecated.includes(name) &&
    !off.includes(name) &&
    (!only.length || only.includes(name));
};

const requireAndNorm = (plugins, name) => {
  const Plugin = require(name);
  if (!isBrunchPlugin(Plugin)) return plugins;

  const plugin = new Plugin(config);
  plugin.brunchPluginName = name;

  return [...plugins, adapter(plugin)];
};

const isBrunchPlugin = fn => {
  return typeof fn === 'function' &&
    fn.prototype &&
    fn.prototype.brunchPlugin;
};

const byEnv = plugin => {
  if (on.includes(plugin.brunchPluginName)) return true;

  const env = plugin.defaultEnv;
  if (!env) return plugin.optimize ? config.optimize : true;

  return env === '*' || config.env.includes(env);
};

const plugins = exports.plugins = getDeps()
  .filter(byName)
  .reduce(requireAndNorm, [])
  .filter(byEnv);

Object.freeze(plugins);

exports.respondTo = key => {
  return plugins.filter(plugin => typeof plugin[key] === 'function');
};

exports.includes = co(function* () {
  const promises = plugins.map(plugin => plugin.include || []);
  const includes = flat(yield Promise.all(promises));
  const relative = includes.map(path => {
    return sysPath.relative(config.paths.root, path);
  });

  return uniq(relative);
})();
