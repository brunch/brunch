'use strict';
const logger = require('loggy');
const promisify = require('micro-promisify');

const methods = {
  getDependencies: 2,
  lint: 2,
  compile: 1,
  optimize: 1,
};

const wrapInFile = data => {
  return typeof data === 'string' ? {data} : data;
};

const extToRe = ext => {
  if (!ext) return;

  const escaped = `.${ext}$`.replace(/\./g, '\\.');
  return new RegExp(escaped, 'i');
};

const safePromise = (promise, timeoutMessage) => {
  const warningLogInterval = 15000;
  const id = setInterval(() => {
    logger.warn(timeoutMessage);
  }, warningLogInterval);

  return promise.then(value => {
    clearInterval(id);
    return value;
  }, reason => {
    clearInterval(id);
    throw reason;
  });
};

const promisifyMethod = (plugin, key) => {
  const fn = plugin[key];
  if (typeof fn !== 'function') return;
  if (fn.length === 1) return;

  const newAPI = key === 'compile' || key === 'optimize';
  const spreadArgs = newAPI && fn.length < 3;

  if (fn.length !== methods[key]) {
    fn = promisify(fn);
  }

  plugin[key] = file => {
    const args = spreadArgs ? [file] : [file.data, file.path];
    const message = `${plugin.brunchPluginName} is taking too long to ${key} @ ${file.path}`;

    return safePromise(fn.apply(plugin, args), message).then(wrapInFile);
  };
};

module.exports = plugin => {
  // Backwards compatibility for legacy optimizers.
  if (typeof plugin.minify === 'function' && !plugin.optimize) {
    plugin.optimize = plugin.minify;
  }

  // Assume plugin is meant for any env.
  if (!plugin.defaultEnv) plugin.defaultEnv = '*';

  // Normalize includes to an array.
  if (typeof plugin.include === 'function') {
    plugin.include = plugin.include();
  } else if (plugin.include == null) {
    plugin.include = [];
  }

  Object.keys(methods).forEach(key => {
    promisifyMethod(plugin, key);
  });

  plugin.pattern = plugin.pattern ||
    extToRe(plugin.extension) ||
    /.^/; // never matches

  plugin.staticPattern = plugin.staticPattern ||
    extToRe(plugin.staticExtension) ||
    plugin.pattern;

  return plugin;
};
