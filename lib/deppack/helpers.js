'use strict';
const sysPath = require('path');
const stat = require('micro-promisify')(require('fs').stat);
const isDir = path => stat(path).then(stats => stats.isDirectory(), () => Promise.resolve(false));

const isRelative = path => path.slice(0, 2) === './' || path.slice(0, 3) === '../';
const makeRelative = path => path.replace(process.cwd() + sysPath.sep, '');

const not = f => i => !f(i);

const uniq = list => {
  return Object.keys(list.reduce((obj, _) => {
    if (!obj[_]) obj[_] = true;
    return obj;
  }, {}));
};

module.exports = {isDir, makeRelative, isRelative, not, uniq};
