'use strict';
const neverMatches = /.^/;

const normExt = ext => {
  return typeof ext === 'string'
    ? ext.replace(/^\.*/, '.')
    : ext;
};

const extToRegExp = ext => {
  if (ext) {
    const escaped = normExt(ext).replace(/\./g, '\\.');
    return new RegExp(`${escaped}$`, 'i');
  }
};

const wrapStrings = fn => {
  return file => fn(file).then(res => {
    // handle buffers
    return res;
    // return typeof data === 'string' ? {data} : data;
  });
};

const warnIfLong = (fn, plugin, key) => {
  return file => {
    const id = setInterval(() => {
      logger.warn(`${plugin.brunchPluginName} is taking too long to ${key} @ ${file.path}`);
    }, 15000);

    return fn(file).finally(() => {
      clearInterval(id);
    });
  };
};

module.exports = plugin => {
  return ex({
    get targetExtension() {
      return normExt(super.targetExtension);
    },
    get staticTargetExtension() {
      return normExt(super.staticTargetExtension);
    },
    get pattern() {
      return super.pattern
        || extToRegExp(super.extension)
        || neverMatches;
    },
    get staticPattern() {
      return super.staticPattern
        || extToRegExp(super.staticExtension)
        || super.pattern;
    },
  });
};
