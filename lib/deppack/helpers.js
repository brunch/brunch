'use strict';

const sysPath = require('path');
const fs = require('fs');
const mediator = require('../mediator');

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

const packageRe = /node_modules/;
const isPackage = path => packageRe.test(path) && (mediator.npm.static || []).indexOf(path) === -1;
const isVendor = path => isPackage(path) ? false : mediator.conventions.vendor.test(path);
const isApp = path => !mediator.conventions.vendor.test(path);

module.exports = {isDir, makeRelative, isRelative, not, globalPseudofile, isVendor, isApp, isPackage};
