'use strict';

const sysPath = require('path');
const deepExtend = require('../helpers').deepExtend;
const mediator = require('../mediator');
const helpers = require('./helpers');
const shims = require('./shims');

const not = helpers.not;
const slashes = string => string.replace(/\\/g, '/');


// Helpers

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

const relativeToRoot = (filePath, relPath) => sysPath.join(
  getModuleRootPath(filePath), relPath
);



// Naming

const getModuleRootPath = path => {
  const split = path.split(sysPath.sep);
  const index = split.lastIndexOf('node_modules');
  const scoped = split[index + 1][0] === '@';
  return split.slice(0, index + 2 + (scoped ? 1 : 0)).join(sysPath.sep);
};

const getModuleRootName = path => {
  const split = path.split(sysPath.sep);
  const index = split.lastIndexOf('node_modules');
  const scoped = split[index + 1][0] === '@';
  return split.slice(index + 1, index + 2 + (scoped ? 1 : 0)).join('/');
};

const getModuleFullRootName = path => {
  const split = path.split(sysPath.sep);
  const indexS = split.indexOf('node_modules');
  const indexE = split.lastIndexOf('node_modules');
  const scoped = split[indexE + 1][0] === '@';
  return split.slice(indexS + 1, indexE + 2 + (scoped ? 1 : 0)).join('/');
};

const generateModuleName = filePath => generateFileBasedModuleName(filePath).replace(/\/([^/]+)\.(json|js)$/, '/$1');

const generateFileBasedModuleName = filePath => {
  const rootName = getModuleFullRootName(filePath);
  const rootPath = getModuleRootPath(filePath);
  const path = filePath.replace(rootPath, '');
  return slashes(rootName + path);
};


// Definitions

const definition = (name, exp) => {
  return `require.register("${name}", function(exports, require, module) {
  module.exports = ${exp};
});`;
};

const aliasDef = (target, source) => `require.alias("${source}", "${target}");`;
const simpleShimDef = (name, obj) => definition(name, JSON.stringify(obj));

// Hanlding of main file and browser overrides

let rootMainCache = {};

const getMainCached = path => rootMainCache[getModuleRootPath(path)];
const cacheMain = path => _getMainFile(path).then(file => rootMainCache[getModuleRootPath(path)] = file);

const resetCache = () => rootMainCache = {};

const relativeOverrides = path => {
  const brMap = browserMappings(path);

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

const shimAliases = () => {
  return shims.getUsedShims().reduce((acc, x) => {
    const mod = generateFileBasedModuleName(shims.fileShims[x]);
    acc[x] = mod;
    return acc;
  }, {});
};

const requiredAliases = () => {
  const aliases = Object.keys(rootMainCache).reduce((memo, path) => {
    const file = rootMainCache[path];
    const pkg = getModuleFullRootName(file);
    const name = generateFileBasedModuleName(file);

    Object.assign(memo, relativeOverrides(path));
    if (name !== pkg + '/index.js') {
      memo[pkg] = name;
    }
    return memo;
  }, {});

  return Object.assign(aliases, shimAliases());
};

const browserMappings = (filePath, mainFile) => {
  const pkg = packageJson(filePath);
  const browser = pkg.browser || pkg.browserify;
  if (browser && typeof browser === 'object') {
    return browser;
  } else if (browser) {
    const obj = {};
    const main = mainFile || getMainCached(filePath);
    if (!main) return {};
    const path = sysPath.relative(getModuleRootPath(filePath), main);
    obj['./' + path] = './' + sysPath.join('.', browser);
    return obj;
  } else {
    return {};
  }
};

const _getMainFile = filePath => {
  const root = getModuleRootPath(filePath);
  const json = packageJson(filePath);

  const depMain = json.main || 'index.js';
  const fileOrDir = sysPath.join(root, depMain);
  return helpers.isDir(fileOrDir).then(isDir => {
    if (isDir) {
      return sysPath.join(fileOrDir, 'index.js');
    } else {
      return fileOrDir.indexOf('.js') === -1 ? fileOrDir + '.js' : fileOrDir;
    }
  }).then(main => {
    return mappedMainFile(main);
  });
};

const globalBrowserMappings = filePath => {
  const brMap = browserMappings(filePath);

  return Object.keys(brMap).filter(not(helpers.isRelative)).reduce((newBrMap, key) => {
    const val = brMap[key];
    newBrMap[key] = val ? (helpers.isRelative(val) ? generateModuleName(relativeToRoot(filePath, val)) : val) : false;
    return newBrMap;
  }, {});
};

const mappedMainFile = filePath => {
  const brMap = browserMappings(filePath, filePath);

  Object.keys(brMap).forEach(key => {
    const val = brMap[key];
    if (val && key && filePath === relativeToRoot(filePath, key)) {
      filePath = relativeToRoot(filePath, val);
    }
  });

  return filePath;
};


// Module wrapping

const getHeader = (moduleName, filePath, source) => {
  const brMap = globalBrowserMappings(filePath);

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
    return definition(moduleName, source);
  }
};

const generateModule = (filePath, source) => {
  return getHeader(generateFileBasedModuleName(filePath), filePath, source);
};

const makeRequire = (
`\nvar __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
`);

module.exports = {aliasDef, simpleShimDef, applyPackageOverrides, generateModule, generateFileBasedModuleName, getModuleRootName, makeRequire, cacheMain, packageJson, resetCache, requiredAliases};
