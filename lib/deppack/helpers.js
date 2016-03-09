'use strict';

const sysPath = require('path');
const fs = require('fs');
const anymatch = require('anymatch');
const deepExtend = require('../helpers').deepExtend;
const getModuleRootPath = require('./module-naming').getModuleRootPath;

const fsstat = require('../helpers').promisify(fs.stat);
const isDir = path => fsstat(path).then(stat => stat.isDirectory(), () => Promise.resolve(false));

const isRelative = path => path.slice(0, 2) === './' || path.slice(0, 3) === '../';
const makeRelative = path => path.replace(process.cwd() + sysPath.sep, '');

const not = f => i => !f(i);

const globalPseudofile = '___globals___';

const packageRe = /node_modules/;
const isPackage = npmConfig => path => packageRe.test(path) && (npmConfig.npm.static || []).indexOf(path) === -1;
const isVendor = npmConfig => path => isPackage(npmConfig)(path) ? false : anymatch(npmConfig.conventions.vendor, path);
const isApp = npmConfig => path => !anymatch(npmConfig.conventions.vendor, path);

const uniq = list => {
  return Object.keys(list.reduce((obj, _) => {
    if (!obj[_]) obj[_] = true;
    return obj;
  }, {}));
};

const applyPackageOverrides = (pkg, npmConfig) => {
  const pkgOverride = npmConfig.overrides[pkg.name];

  if (pkgOverride) {
    pkg = deepExtend(pkg, pkgOverride);
  }

  return pkg;
};

const getDepPackageJson = (depPath, npmConfig) => {
  const depJson = require(sysPath.join(depPath, 'package.json'));
  applyPackageOverrides(depJson, npmConfig);
  return depJson;
};

const packageJson = (filePath, npmConfig) => getDepPackageJson(
  getModuleRootPath(filePath),
  npmConfig
);

module.exports = {isDir, makeRelative, isRelative, not, globalPseudofile, isVendor, isApp, isPackage, uniq, applyPackageOverrides, packageJson};
