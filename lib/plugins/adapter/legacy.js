'use strict';
const pify = require('pify');
const logger = require('loggy');
const {pifyHook} = require('../../utils');

const normMethods = plugin => {
  const methods = {};

  methods.lint = methods.getDependencies = [bind, promisify(false), thenify];
  methods.compile = methods.optimize = [bind, promisify(true), thenify, wrapStrings];
  methods.compileStatic = [bind, thenify, wrapStrings];

  for (const [key, decorators] of Object.entries(methods)) {
    const fn = plugin[key];
    if (typeof fn !== 'function') continue;

    const compose = (fn, decorator) => decorator(fn, plugin, key);
    plugin[key] = decorators.reduce(compose, fn);
  }
};

const promisify = returnsFile => fn => {
  switch (fn.length) {
    case 1:
      // Modern API:
      return fn;
    case 2:
      // Legacy API:
      return returnsFile ?
        pify(fn) : // fn(file, callback) => void
        file => fn(file.data, file.path); // fn(data, path) => Promise
    case 3:
      // Legacy API: fn(data, path, callback) => void
      const promisified = pify(fn);
      return file => promisified(file.data, file.path);
  }
};

// UTIL
const bind = (fn, plugin) => fn.bind(plugin);

// UTIL
const thenify = fn => {
  return file => Promise.resolve(file).then(fn);
};

module.exports = plugin => {
  if (typeof plugin.minify === 'function' && plugin.optimize == null) {
    plugin.optimize = plugin.minify;
  }

  ex({
    get include() {
      const res = super.include;

      return typeof res === 'function' ?
        res.call(plugin) :
        res;
    },
  })

  normMethods(plugin);
  pifyHook(plugin);

  return plugin;
};
