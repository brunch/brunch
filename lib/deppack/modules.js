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

const getModuleRootName = path => {
  const split = path.split(sysPath.sep);
  const index = split.lastIndexOf('node_modules');
  return split[index + 1];
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
    const path = sysPath.relative(getModuleRootPath(filePath), getMainFile(filePath));
    obj['./' + path] = './' + sysPath.join('.', browser);
    return obj;
  } else {
    return {};
  }
};

const getMainFile = filePath => {
  const root = getModuleRootPath(filePath);
  const json = packageJson(filePath);

  return _mainFile(root, json);
};

const _mainFile = (root, json) => {
  const depMain = json.main || 'index.js';
  const fileOrDir = sysPath.join(root, depMain);
  if (helpers.isDir(fileOrDir)) {
    return sysPath.join(fileOrDir, 'index.js');
  } else {
    return fileOrDir.indexOf('.js') === -1 ? fileOrDir + '.js' : fileOrDir;
  }
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

const isMain = filePath => getMainFile(filePath) === sysPath.resolve(expandedFilePath(filePath));

const getNewHeader = (moduleName, source, filePath) => {
  const brMap = globalBrowserMappings(filePath);

  const p = filePath.replace(getModuleRootPath(filePath), '').replace('.js', '').split(sysPath.sep).slice(0, -1);
  const p2 = [moduleName].concat(p).join('/');
  const r = isMain(filePath) ?
    "function(n) { return req(n.replace('./', '" + p2 + "/')); }" :
    'req';

  const glob = shims.findGlobals(source);

  if (shims.shouldOverrideModuleName(moduleName)) moduleName = shims.overrideModuleName(moduleName);

  const fbModuleName = generateFileBasedModuleName(filePath);
  const fbAlias = shims.shouldIncludeFileBasedAlias(moduleName) ?
    aliasDef(fbModuleName, moduleName) :
    '';

  return `require.register('${moduleName}', function(exports,req,module){
    var require = __makeRequire((${r}), ${JSON.stringify(brMap)});
    ${glob}(function(exports,require,module) {
      ${source}
    })(exports,require,module);
  });${fbAlias}`;
};

const generateModule = (filePath, source) => {
  const expandedPath = expandedFilePath(filePath);
  const mn = generateModuleName(expandedPath);

  return getNewHeader(mn, source, expandedPath);
};

const slashes = string => string.replace(/\\/g, '/');

const generateModuleName = filePath => {
  const rp = getModuleRootPath(filePath);
  const mn = getModuleRootName(filePath) +
    (isMain(filePath) ? '' : filePath.replace(rp, '').replace('.js', ''));

  return slashes(mn);
};

const generateFileBasedModuleName = filePath => {
  return slashes(getModuleRootName(filePath) + filePath.replace(getModuleRootPath(filePath), '').replace('.js', ''));
};

module.exports = {aliasDef, simpleShimDef, applyPackageOverrides, generateModule, generateModuleName};
