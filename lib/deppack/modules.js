'use strict';

const sysPath = require('path');
const helpers = require('./helpers');
const shims = require('./shims');
const moduleDefinitions = require('./module-definitions');
const moduleNaming = require('./module-naming');

const not = helpers.not;


// Naming

const getModuleRootPath = moduleNaming.getModuleRootPath;
const getModuleFullRootName = moduleNaming.getModuleFullRootName;
const generateModuleName = moduleNaming.generateModuleName;
const generateFileBasedModuleName = moduleNaming.generateFileBasedModuleName;


// Helpers

const packageJson = helpers.packageJson;

const relativeToRoot = (filePath, relPath) => sysPath.join(
  getModuleRootPath(filePath), relPath
);


// Hanlding of main file and browser overrides

const getMainCached = (npmConfig, path) => npmConfig.rootMainCache[getModuleRootPath(path)];
const cacheMain = (npmConfig, path) => _getMainFile(npmConfig, path).then(file => npmConfig.rootMainCache[getModuleRootPath(path)] = file);

const relativeOverrides = (path, npmConfig) => {
  const brMap = browserMappings(path, null, npmConfig);

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

const shimAliases = (npmConfig) => {
  return shims.getUsedShims(npmConfig).reduce((acc, x) => {
    const mod = generateFileBasedModuleName(shims.fileShims[x]);
    acc[x] = mod;
    return acc;
  }, {});
};

const requiredAliases = (npmConfig) => {
  const aliases = Object.keys(npmConfig.rootMainCache).reduce((memo, path) => {
    const file = npmConfig.rootMainCache[path];
    const pkg = getModuleFullRootName(file);
    const name = generateFileBasedModuleName(file);

    Object.assign(memo, relativeOverrides(path, npmConfig));
    if (name !== pkg + '/index.js') {
      memo[pkg] = name;
    }
    return memo;
  }, {});

  return Object.assign(aliases, shimAliases(npmConfig));
};

const browserMappings = (filePath, mainFile, npmConfig) => {
  const pkg = packageJson(filePath, npmConfig);
  const browser = pkg.browser || pkg.browserify;
  if (browser && typeof browser === 'object') {
    return browser;
  } else if (browser) {
    const obj = {};
    const main = mainFile || getMainCached(npmConfig, filePath);
    if (!main) return {};
    const path = sysPath.relative(getModuleRootPath(filePath), main);
    const mapping = sysPath.join('.', browser);
    if (path === mapping) return {};
    obj['./' + path] = './' + mapping;
    return obj;
  } else {
    return {};
  }
};

const _getMainFile = (npmConfig, filePath) => {
  const root = getModuleRootPath(filePath);
  const json = packageJson(filePath, npmConfig);

  const depMain = json.main || 'index.js';
  const fileOrDir = sysPath.join(root, depMain);
  return helpers.isDir(fileOrDir).then(isDir => {
    if (isDir) {
      return sysPath.join(fileOrDir, 'index.js');
    } else {
      return fileOrDir.indexOf('.js') === -1 ? fileOrDir + '.js' : fileOrDir;
    }
  }).then(main => {
    return mappedMainFile(npmConfig, main);
  });
};

const globalBrowserMappings = (filePath, npmConfig) => {
  const brMap = browserMappings(filePath, null, npmConfig);

  return Object.keys(brMap).filter(not(helpers.isRelative)).reduce((newBrMap, key) => {
    const val = brMap[key];
    newBrMap[key] = val ? (helpers.isRelative(val) ? generateModuleName(relativeToRoot(filePath, val)) : val) : false;
    return newBrMap;
  }, {});
};

const mappedMainFile = (npmConfig, filePath) => {
  const brMap = browserMappings(filePath, filePath, npmConfig);

  Object.keys(brMap).forEach(key => {
    const val = brMap[key];
    if (val && key && filePath === relativeToRoot(filePath, key)) {
      filePath = relativeToRoot(filePath, val);
    }
  });

  return filePath;
};


// Module wrapping

const getHeader = (npmConfig, moduleName, filePath, source) => {
  const brMap = globalBrowserMappings(filePath, npmConfig);

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

const generateModule = (npmConfig, filePath, source) => {
  return getHeader(npmConfig, generateFileBasedModuleName(filePath), filePath, source);
};

const wrap = (npmConfig, filePath, source) => {
  return cacheMain(npmConfig, filePath).then(() => generateModule(npmConfig, filePath, source));
};


module.exports = {wrap, requiredAliases};
