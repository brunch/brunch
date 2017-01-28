'use strict';
const microPromisify = require('micro-promisify');
const logger = require('loggy');

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
  let include = plugin.include;
  if (typeof include === 'function') {
    include = include.call(plugin);
  }

  const value = Promise.resolve(include).then(path => {
    return path == null ? [] : [].concat(path);
  });

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

  Object.keys(methods).forEach(key => {
    const fn = plugin[key];
    if (typeof fn !== 'function') return;

    const decorators = methods[key];
    const compose = (fn, decorator) => decorator(fn, plugin, key);

    plugin[key] = decorators.reduce(compose, fn);
  });
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
        microPromisify(fn) : // fn(file, callback) => void
        file => fn(file.data, file.path); // fn(data, path) => Promise
    case 3:
      // Legacy API: fn(data, path, callback) => void
      const promisified = microPromisify(fn);
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
  const warningLogInterval = 15000;
  const tooLongMessage = `${plugin.brunchPluginName} is taking too long to ${key}`;

  return file => {
    const id = setInterval(() => {
      logger.warn(`${tooLongMessage} @ ${file.path}`);
    }, warningLogInterval);

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
