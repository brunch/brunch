'use strict';
const pify = require('pify');
const logger = require('loggy');
const {
  toArr,
  pifyHook,
} = require('../utils');

const normExt = ext => {
  return typeof ext === 'string' ?
    ext.replace(/^\.*/, '.') :
    ext;
};

const extToRegExp = ext => {
  if (!ext) return;
  const escaped = normExt(ext).replace(/\./g, '\\.');
  return new RegExp(`${escaped}$`, 'i');
};

// Normalize includes to promise that resolves to array.
const normInclude = plugin => {
  const value = Promise.try(() => {
    const {include} = plugin;
    return typeof include === 'function' ?
      include.call(plugin) :
      include;
  }).then(toArr);

  // Don't call setter (it is probably missing)
  Object.defineProperty(plugin, 'include', {
    value,
    writable: true,
    configurable: true,
  });
};

const normMethods = plugin => {
  const methods = {};
  methods.lint = methods.getDependencies = [bind, promisify(false), thenify, warnIfLong];
  methods.compile = methods.optimize = [bind, promisify(true), thenify, wrapStrings, warnIfLong];
  methods.compileStatic = [bind, thenify, wrapStrings, warnIfLong];

  for (const [key, decorators] of Object.entries(methods)) {
    const fn = plugin[key];
    if (typeof fn !== 'function') continue;

    const compose = (fn, decorator) => decorator(fn, plugin, key);
    plugin[key] = decorators.reduce(compose, fn);
  }
};

const bind = (fn, plugin) => fn.bind(plugin);
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

const thenify = fn => {
  return file => Promise.resolve(file).then(fn);
};

const wrapStrings = fn => {
  return file => fn(file).then(data => {
    return typeof data === 'string' ? {data} : data;
  });
};

const warnIfLong = (fn, plugin, key) => {
  const tooLongMessage = `${plugin.brunchPluginName} is taking too long to ${key}`;

  return file => {
    const id = setInterval(() => {
      logger.warn(`${tooLongMessage} @ ${file.path}`);
    }, 15000);

    return fn(file).finally(() => {
      clearInterval(id);
    });
  };
};

module.exports = plugin => {
  // Backwards compatibility for legacy optimizers.
  if (typeof plugin.minify === 'function' && !plugin.optimize) {
    plugin.optimize = plugin.minify;
  }

  normInclude(plugin);
  normMethods(plugin);
  pifyHook(plugin);

  plugin.targetExtension = normExt(plugin.targetExtension);
  plugin.pattern = plugin.pattern ||
    extToRegExp(plugin.extension) ||
    /.^/; // never matches

  if (plugin.type === 'template' && plugin.compileStatic) {
    plugin.staticTargetExtension = normExt(plugin.staticTargetExtension) || '.html';
    plugin.staticPattern = plugin.staticPattern ||
      extToRegExp(plugin.staticExtension) ||
      plugin.pattern;
  }

  return plugin;
};
