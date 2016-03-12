'use strict';

const sysPath = require('path');
const stat = require('micro-promisify')(require('fs').stat);
const helpers = require('./helpers');
const shims = require('./shims');
const moduleDefinitions = require('./module-definitions');
const moduleNaming = require('./module-naming');

// Naming

const getModuleRootPath = moduleNaming.getModuleRootPath;
const getModuleFullRootName = moduleNaming.getModuleFullRootName;
const generateModuleName = moduleNaming.generateModuleName;
const generateFileBasedModuleName = moduleNaming.generateFileBasedModuleName;


// Helpers

const isDirectory = path => stat(path).then(stats => stats.isDirectory(), () => Promise.resolve(false));

const relativeToRoot = (filePath, relPath) => sysPath.join(
  getModuleRootPath(filePath), relPath
);


// Hanlding of main file and browser overrides

const getMainCached = (rootMainCache, path) => rootMainCache[getModuleRootPath(path)];
const cacheMain = (getPackageJson, rootMainCache, path) => {
  return _getMainFile(getPackageJson, path)
    .then(file => rootMainCache[getModuleRootPath(path)] = file);
};

const relativeOverrides = (path, brMap) => {
  return Object.keys(brMap).filter(helpers.isRelative).reduce((memo, key) => {
    const val = brMap[key];
    if (!val) return memo;
    // two targets because we want to alias both "pkg/aliased" and "pkg/aliased.js" to `source`
    const target1 = generateModuleName(relativeToRoot(path, key));
    const target2 = generateFileBasedModuleName(relativeToRoot(path, key));
    const source = generateFileBasedModuleName(relativeToRoot(path, val));
    memo[target1] = source;
    memo[target2] = source;
    return memo;
  }, {});
};

const shimAliases = (usedShims) => {
  return usedShims.toArray().reduce((acc, x) => {
    const mod = generateFileBasedModuleName(shims.fileShims[x]);
    acc[x] = mod;
    return acc;
  }, {});
};

const requiredAliases = (rootMainCache, getPackageJson, usedShims) => {
  const aliases = Object.keys(rootMainCache).reduce((memo, path) => {
    const file = rootMainCache[path];
    const pkg = getModuleFullRootName(file);
    const name = generateFileBasedModuleName(file);

    const brMap = browserMappings(path, getPackageJson, rootMainCache);
    Object.assign(memo, relativeOverrides(path, brMap));
    if (name !== pkg + '/index.js') {
      memo[pkg] = name;
    }
    return memo;
  }, {});

  return Object.assign(aliases, shimAliases(usedShims));
};

const _browserMappings = (pkg, filePath, defaultMain) => {
  const browser = pkg.browser || pkg.browserify;
  if (browser && typeof browser === 'object') {
    return browser;
  } else if (browser) {
    const obj = {};
    if (!defaultMain) return {};
    const path = sysPath.relative(getModuleRootPath(filePath), defaultMain);
    const mapping = sysPath.join('.', browser);
    if (path === mapping) return {};
    obj['./' + path] = './' + mapping;
    return obj;
  } else {
    return {};
  }
};

const browserMappings = (filePath, getPackageJson, rootMainCache) => {
  const pkg = getPackageJson(filePath);
  const defaultMain = getMainCached(rootMainCache, filePath);
  return _browserMappings(pkg, filePath, defaultMain);
};

const _appendJs = (path) => path.indexOf('.js') === -1 ? `${path}.js` : path;

const _mainFileName = (depMain, root) => {
  if (!depMain) depMain = 'index.js';
  const fileOrDir = sysPath.join(root, depMain);
  return isDirectory(fileOrDir).then(isDir => {
    return isDir ? sysPath.join(fileOrDir, 'index.js') : _appendJs(fileOrDir);
  });
};

const _getMainFile = (getPackageJson, filePath) => {
  const root = getModuleRootPath(filePath);
  const json = getPackageJson(filePath);

  return _mainFileName(json.main, root)
    .then(main => {
      const pkg = getPackageJson(main);
      const brMap = _browserMappings(pkg, main, main);
      return mappedMainFile(brMap, main);
    });
};

const mappedMainFile = (brMap, filePath) => {
  Object.keys(brMap).forEach(key => {
    const val = brMap[key];
    if (val && key && filePath === relativeToRoot(filePath, key)) {
      filePath = relativeToRoot(filePath, val);
    }
  });

  return filePath;
};

const globalBrowserMappings = (filePath, brMap) => {
  return Object.keys(brMap).filter(helpers.not(helpers.isRelative)).reduce((newBrMap, key) => {
    const val = brMap[key];
    newBrMap[key] = val ? (helpers.isRelative(val) ? generateModuleName(relativeToRoot(filePath, val)) : val) : false;
    return newBrMap;
  }, {});
};


// Module wrapping

const generateModule = (getPackageJson, rootMainCache, filePath, source) => {
  const moduleName = generateFileBasedModuleName(filePath);
  let brMap = browserMappings(filePath, getPackageJson, rootMainCache);
  brMap = globalBrowserMappings(filePath, brMap);

  const glob = shims.findGlobals(source);

  if (filePath.indexOf('.json') === -1) {
    const mappings = JSON.stringify(brMap);
    const name = getModuleFullRootName(filePath);
    return (
`\nrequire.register("${moduleName}", function(exports, require, module) {
  require = __makeRelativeRequire(require, ${mappings}, "${name}");
  ${glob}(function() {
    ${source.trim()}
  })();
});`);
  } else {
    return moduleDefinitions.definition(moduleName, source);
  }
};

const wrap = (getPackageJson, rootMainCache, filePath, source) => {
  return cacheMain(getPackageJson, rootMainCache, filePath)
    .then(() => generateModule(getPackageJson, rootMainCache, filePath, source));
};


module.exports = {wrap, requiredAliases};
