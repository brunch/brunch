'use strict';

const sysPath = require('./path');
const deepAssign = require('deep-assign');
const moduleNaming = require('./module-naming');
const shims = require('./shims');
const isRelative = require('./helpers').isRelative;
const getModuleRootPath = require('./module-naming').getModuleRootPath;

const canCallDep = (getPackageJson, path) => {
  const currRoot = moduleNaming.getModuleRootName(path);
  const pkg = getPackageJson(sysPath.resolve(path));
  const deps = Object.assign({}, pkg.dependencies || {}, pkg.peerDependencies || {});
  const devDeps = Object.assign({}, pkg.devDependencies || {});
  return dep => {
    const root = moduleNaming.getModuleTopRootName(dep);
    const browser = typeof pkg.browser === 'object' ? pkg.browser : typeof pkg.browserify === 'object' ? pkg.browserify : {};
    // ignore optional dependencies
    return (isRelative(dep) ||
            root in deps ||
            (root === 'babel-runtime' && root in devDeps) || // babel-runtime can be declared as a devDep, still needs to be included
            browser[root] && browser[root] in deps ||
            root === currRoot ||
            root in shims.fileShims ||
            shims.emptyShims.indexOf(root) !== -1);
  };
};

const applyPackageOverrides = (pkg, rootPackage) => {
  const pkgOverride = rootPackage.overrides[pkg.name];
  if (pkgOverride) pkg = deepAssign({}, pkg, pkgOverride);
  return pkg;
};

const getDepPackageJson = (depPath, rootPackage) => {
  const depJson = require(sysPath.join(depPath, 'package.json'));
  applyPackageOverrides(depJson, rootPackage);
  return depJson;
};

const packageJson = (filePath, rootPackage) => getDepPackageJson(
  getModuleRootPath(filePath),
  rootPackage
);

module.exports = {canCallDep, applyPackageOverrides, packageJson};
