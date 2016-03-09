'use strict';

const sysPath = require('path');
const fs = require('fs');
const anymatch = require('anymatch');
const mediator = require('../mediator');
const deepExtend = require('../helpers').deepExtend;
const getModuleRootPath = require('./module-naming').getModuleRootPath;

const fsstat = require('../helpers').promisify(fs.stat);
const isDir = path => fsstat(path).then(stat => stat.isDirectory(), () => Promise.resolve(false));

const isRelative = path => path.slice(0, 2) === './' || path.slice(0, 3) === '../';
const makeRelative = path => path.replace(process.cwd() + sysPath.sep, '');

const not = f => i => !f(i);

const globalPseudofile = '___globals___';

const packageRe = /node_modules/;
const isPackage = path => packageRe.test(path) && (mediator.npm.static || []).indexOf(path) === -1;
const isVendor = path => isPackage(path) ? false : anymatch(mediator.conventions.vendor, path);
const isApp = path => !anymatch(mediator.conventions.vendor, path);

const uniq = list => {
  return Object.keys(list.reduce((obj, _) => {
    if (!obj[_]) obj[_] = true;
    return obj;
  }, {}));
};

const applyPackageOverrides = pkg => {
  const pkgOverride = mediator.overrides[pkg.name];

  if (pkgOverride) {
    pkg = deepExtend(pkg, pkgOverride);
  }

  return pkg;
};

const getDepPackageJson = depPath => {
  const depJson = require(sysPath.join(depPath, 'package.json'));
  applyPackageOverrides(depJson);
  return depJson;
};

const packageJson = filePath => getDepPackageJson(
  getModuleRootPath(filePath)
);

module.exports = {isDir, makeRelative, isRelative, not, globalPseudofile, isVendor, isApp, isPackage, uniq, applyPackageOverrides, packageJson};
