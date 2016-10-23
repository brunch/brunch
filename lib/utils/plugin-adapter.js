'use strict';
const debug = require('debug')('brunch:plugin-adapter');
const logger = require('loggy');
const promisify = require('micro-promisify');
const methods = [
  'getDependencies',
  'lint',
  'compile',
  'optimize',
];

const extToRegExp = ext => {
  if (!ext) return;
  const escaped = `.${ext}$`.replace(/\./g, '\\.');
  return new RegExp(escaped, 'i');
};

const safeWrapInFile = (plugin, key) => {
  const fn = plugin[key];
  if (typeof fn !== 'function') return;

  const warningLogInterval = 15000;
  const tooLongMessage = `${plugin.brunchPluginName} is taking too long to ${key}`;

  plugin[key] = file => {
    const id = setInterval(() => {
      logger.warn(`${tooLongMessage} @ ${file.path}`);
    }, warningLogInterval);

    return fn.call(plugin, file).then(data => {
      clearInterval(id);
      return typeof data === 'string' ? {data} : data;
    }, reason => {
      clearInterval(id);
      throw reason;
    });
  };
};

const promisifyMethod = (plugin, key) => {
  const fn = plugin[key];
  if (typeof fn !== 'function') return;

  const arity = fn.length;

  // Modern API, skip.
  // fn(file) => Promise
  if (arity === 1) return;

  let promisified;

  // Legacy API.
  if (arity === 2) {
    if (key === 'lint' || key === 'getDependencies') {
      // fn(data, path) => Promise
      promisified = file => fn.call(plugin, file.data, file.path);
    } else {
      const bound = promisify(fn);
      // fn(file, callback) => null
      promisified = file => bound.call(plugin, file);
    }
  }

  // Legacy API.
  // fn(data, path, callback) => null
  if (arity === 3) {
    const bound = promisify(fn);
    promisified = file => bound.call(plugin, file.data, file.path);
  }

  if (arity >= 4) throw new Error(`Invalid arity ${arity} for ${plugin.brunchPluginName}.${key}.`);

  debug(`${plugin.brunchPluginName} ${key}() using legacy API (${arity} args)`);
  plugin[key] = promisified;
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

  methods.forEach(key => {
    promisifyMethod(plugin, key);
  });

  methods.concat('compileStatic').forEach(key => {
    safeWrapInFile(plugin, key);
  });

  plugin.pattern = plugin.pattern ||
    extToRegExp(plugin.extension) ||
    /.^/; // never matches

  if (plugin.compileStatic) {
    plugin.staticPattern = plugin.staticPattern ||
      extToRegExp(plugin.staticExtension) ||
      plugin.pattern;
  }

  return plugin;
};
