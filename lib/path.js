'use strict';
const sysPath = require('path');

const isAbsolute = sysPath.isAbsolute;
const basename = sysPath.basename;
const sep = sysPath.sep;

const slashes = x => x.split('\\').join('/');
const unslashes = x => x.split('/').join(sep);

const _wrap = fn => {
  return function() {
    return slashes(fn.apply(sysPath, arguments));
  };
};

const normalize = _wrap(sysPath.normalize);
const relative = _wrap(sysPath.relative);
const resolve = _wrap(sysPath.resolve);
const join = _wrap(sysPath.join);
const dirname = _wrap(sysPath.dirname);

module.exports = {basename, dirname, sep, isAbsolute, slashes, unslashes, relative, join, resolve, normalize};
