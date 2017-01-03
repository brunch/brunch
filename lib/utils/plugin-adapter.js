'use strict';
const debug = require('debug')('brunch:plugin-adapter');
const logger = require('loggy');
const microPromisify = require('micro-promisify');

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

// Normalize includes to an array.
const normInclude = plugin => {
  let include = plugin.include;

  if (typeof include === 'function') {
    include = include.call(plugin);
  }

  include = [].concat(include).filter(path => {
    return typeof path === 'string';
  });

  // Don't call setter (it is probably missing)
  Object.defineProperty(plugin, 'include', {
    value: include,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

const normMethods = (plugin, methods) => {
  Object.keys(methods).forEach(key => {
    const decorators = methods[key];
    plugin[key] = decorators.reduce((fn, decorator) => {
      return decorator(fn, plugin);
    }, plugin[key]);
  });
};

const bind = (fn, plugin) => fn.bind(plugin);
const promisify = returnsFile => fn => {
  switch (fn.length) {
    case 1:
      // Modern API:
      return file => Promise.resolve(file).then(fn);
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

const wrapStrings = fn => {
  return file => fn(file).then(data => {
    return typeof data === 'string' ? {data} : data;
  });
};

const warnTooLong = (fn, plugin) => {
  const warningLogInterval = 15000;
  const tooLongMessage = `${plugin.brunchPluginName} is taking too long to ${fn.name}`;

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
  normMethods(plugin, {
    lint: [bind, promisify(false), warnTooLong],
    getDependencies: [bind, promisify(false), warnTooLong],
    compile: [bind, promisify(true), wrapStrings, warnTooLong],
    compileStatic: [bind, promisify(true), wrapStrings, warnTooLong],
    optimize: [bind, promisify(true), wrapStrings, warnTooLong],
  });

  plugin.targetExtension = normExt(plugin.targetExtension);
  plugin.pattern = plugin.pattern ||
    extToRegExp(plugin.extension) ||
    /.^/; // never matches

  if (plugin.compileStatic) {
    plugin.staticTargetExtension = normExt(plugin.staticTargetExtension) || '.html';
    plugin.staticPattern = plugin.staticPattern ||
      extToRegExp(plugin.staticExtension) ||
      plugin.pattern;
  }

  return plugin;
};
