'use strict';
const sysPath = require('path');

exports.isAbsolute = sysPath.isAbsolute;
exports.basename = sysPath.basename;
exports.sep = sysPath.sep;

exports.slashes = path => path.split('\\').join('/');
exports.unslashes = path => path.split('/').join(exports.sep);

['normalize', 'relative', 'resolve', 'join', 'dirname'].forEach(key => {
  const fn = sysPath[key];
  exports[key] = function() {
    return exports.slashes(fn.apply(sysPath, arguments));
  };
});
