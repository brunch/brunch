'use strict';

const sysPath = require('path');
const helpers = require('./helpers');
const shims = require('./shims');
const deepExtend = require('../helpers').deepExtend;
const mediator = require('../mediator');

const not = helpers.not;

const getModuleRootPath = path => {
  const split = path.split(sysPath.sep);
  const index = split.lastIndexOf('node_modules');
  return split.slice(0, index + 2).join(sysPath.sep);
};

const rootMainCache = {};
const getMainCached = path => rootMainCache[getModuleRootPath(path)];
const cacheMain = path => _getMainFile(path).then(file => rootMainCache[getModuleRootPath(path)] = file);

const getModuleRootName = path => {
  const split = path.split(sysPath.sep);
  const index = split.lastIndexOf('node_modules');
  return split[index + 1];
};

const getModuleFullRootName = path => {
  const split = path.split(sysPath.sep);
  const indexS = split.indexOf('node_modules');
  const indexE = split.lastIndexOf('node_modules');
  return split.slice(indexS + 1, indexE + 2).join('/');
};


const aliasDef = (target, source) => {
  return `require.register('${target}', function(exports,require,module) {
    module.exports = require('${source}');
  });`;
};

const simpleShimDef = (name, obj) => {
  return `require.register('${name}', function(exports, require, module) {
    module.exports = ${JSON.stringify(obj)};
  });`;
};

const relativeToRoot = (filePath, relPath) => sysPath.join(
  getModuleRootPath(filePath), relPath
);

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

const browserMappings = filePath => {
  const pkg = packageJson(filePath);
  const browser = pkg.browser || pkg.browserify;
  if (browser && typeof browser === 'object') {
    return browser;
  } else if (browser) {
    const obj = {};
    const path = sysPath.relative(getModuleRootPath(filePath), getMainCached(filePath));
    obj['./' + path] = './' + sysPath.join('.', browser);
    return obj;
  } else {
    return {};
  }
};

const _getMainFile = filePath => {
  const root = getModuleRootPath(filePath);
  const json = packageJson(filePath);

  return _mainFile(root, json);
};

const _mainFile = (root, json) => {
  const depMain = json.main || 'index.js';
  const fileOrDir = sysPath.join(root, depMain);
  return helpers.isDir(fileOrDir).then(isDir => {
    if (isDir) {
      return sysPath.join(fileOrDir, 'index.js');
    } else {
      return fileOrDir.indexOf('.js') === -1 ? fileOrDir + '.js' : fileOrDir;
    }
  });
};

const globalBrowserMappings = filePath => {
  const brMap = browserMappings(filePath);

  return Object.keys(brMap).filter(not(helpers.isRelative)).reduce((newBrMap, key) => {
    const val = brMap[key];
    if (val) {
      newBrMap[key] = helpers.isRelative(val) ? generateModuleName(relativeToRoot(filePath, val)) : val;
    }
    return newBrMap;
  }, {});
};

const expandedFilePath = filePath => {
  const brMap = browserMappings(filePath);

  Object.keys(brMap).filter(helpers.isRelative).forEach(key => {
    const val = brMap[key];
    if (val && filePath === relativeToRoot(filePath, val)) {
      filePath = relativeToRoot(filePath, key);
    }
  });

  return filePath;
};

const isMain = filePath => getMainCached(filePath) === sysPath.resolve(expandedFilePath(filePath));

const getNewHeader = (moduleName, source, filePath) => {
  const brMap = globalBrowserMappings(filePath);

  const p = filePath.replace(getModuleRootPath(filePath), '').replace('.json', '').replace('.js', '').split(sysPath.sep).slice(0, -1);
  const p2 = [moduleName].concat(p).join('/');
  const r = isMain(filePath) ?
    "function(n) { return req(n.replace('./', '" + p2 + "/')); }" :
    'req';

  const glob = shims.findGlobals(source);

  if (shims.shouldOverrideModuleName(moduleName)) moduleName = shims.overrideModuleName(moduleName);

  if (filePath.indexOf('.json') === -1) {
    const fbModuleName = generateFileBasedModuleName(filePath);
    const fbAlias = shims.shouldIncludeFileBasedAlias(moduleName) ?
      aliasDef(fbModuleName, moduleName) :
      '';

    return `require.register('${moduleName}', function(exports,req,module){
      var require = __makeRequire((${r}), ${JSON.stringify(brMap)}, '${getModuleFullRootName(filePath)}');
      ${glob}(function(exports,require,module) {
        ${source}
      })(exports,require,module);
    });${fbAlias}`;
  } else {
    return `require.register('${moduleName}', function(exports,require,module){
      module.exports = ${source};
    });`;
  }
};

const generateModule = (filePath, source) => {
  const expandedPath = expandedFilePath(filePath);
  const mn = generateModuleName(expandedPath);

  return getNewHeader(mn, source, expandedPath);
};

const slashes = string => string.replace(/\\/g, '/');

const generateModuleName = filePath => {
  const rp = getModuleRootPath(filePath);
  const mn = getModuleFullRootName(filePath) +
    (isMain(filePath) ? '' : filePath.replace(rp, '').replace('.json', '').replace('.js', ''));

  return slashes(mn);
};

const generateFileBasedModuleName = filePath => {
  return slashes(getModuleFullRootName(filePath) + filePath.replace(getModuleRootPath(filePath), '').replace('.json', '').replace('.js', ''));
};

const makeRequire = (
  `var __makeRequire = function(r, __brmap, pref) {
      var none = {};
      var tryReq = function(name, pref) {
        var val;
        try {
          val = r(pref + '/node_modules/' + name);
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
        if (__brmap[name] !== undefined) name = __brmap[name];
        name = name.replace(".js", "");
        if (name[0] !== '.' && pref) {
          var val = tryReq(name, pref);
          if (val !== none) return val;
        }
        return r(name);
      }
    };
  `
);

module.exports = {aliasDef, simpleShimDef, applyPackageOverrides, generateModule, generateModuleName, getModuleRootName, makeRequire, cacheMain};
