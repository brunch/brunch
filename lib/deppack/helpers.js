'use strict';

const sysPath = require('path');
const fs = require('fs');

const isDir = fileOrDir => {
  var result;
  try {
    result = fs.lstatSync(fileOrDir).isDirectory();
  } catch (e) { result = false; }
  return result;
};

const isRelative = path => path.slice(0, 2) === './' || path.slice(0, 3) === '../';
const makeRelative = path => path.replace(process.cwd() + sysPath.sep, '');

const not = f => i => !f(i);

const globalPseudofile = '___globals___';

module.exports = {isDir, makeRelative, isRelative, not, globalPseudofile};
