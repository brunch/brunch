'use strict';
const logger = require('loggy');
const promisify = require('micro-promisify');
const methods = [
  'getDependencies',
  'lint',
  'compile',
  'optimize',
];

const extToRe = ext => {
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
  if (fn.length === 1) return;

  const newAPI = key === 'compile' || key === 'optimize';
  const promisifyArity = newAPI ? 1 : 2;
  const spreadArgs = newAPI && fn.length > 2;

  if (fn.length > promisifyArity) {
    fn = promisify(fn);
  }

  return file => fn.apply(plugin, spreadArgs ?
    [file.data, file.path] :
    [file]
  );
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
    extToRe(plugin.extension) ||
    /.^/; // never matches

  if (plugin.compileStatic) {
    plugin.staticPattern = plugin.staticPattern ||
      extToRe(plugin.staticExtension) ||
      plugin.pattern;
  }

  return plugin;
};
