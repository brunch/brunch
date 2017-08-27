'use strict';
const Module = require('module');
const fs = require('fs');
const sysPath = require('universal-path');

const libPath = sysPath.resolve('lib');
const configPath = require.resolve(`${libPath}/config`);
const pluginsPath = require.resolve(`${libPath}/plugins`);

module.exports = (params = {}) => {
  const {
    modulesDir = 'node_modules',
    modules = {},
    config,
  } = params;

  delete require.cache[configPath];
  delete require.cache[pluginsPath];

  const {_load} = Module;
  const {readdirSync} = fs;

  Module._load = function(...args) {
    const [name] = args;
    return name in modules ?
      modules[name] :
      _load.apply(this, args);
  };

  fs.readdirSync = function(...args) {
    const [dir] = args;
    return dir === modulesDir ?
      Object.keys(modules) :
      readdirSync.apply(this, args);
  };

  try {
    require(configPath).init(config);
    return require(pluginsPath);
  } finally {
    Module._load = _load;
    fs.readdirSync = readdirSync;
  }
};
