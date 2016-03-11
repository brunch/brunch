'use strict';

const sysPath = require('path');
const promisify = require('../helpers').promisify;
const each = promisify(require('async-each'));
const detective = require('detective');

const moduleNaming = require('./module-naming');
const shims = require('./shims');
const helpers = require('./helpers');

const not = helpers.not;

const isJs = (fileList, path) => fileList.find(path).type === 'javascript';

const shouldIncludeDep = (rootPackage, path) => {
  const currRoot = moduleNaming.getModuleRootName(path);
  const pkg = helpers.packageJson(sysPath.resolve(path), rootPackage);
  const deps = Object.assign({}, pkg.dependencies || {}, pkg.peerDependencies || {});
  return dep => {
    const root = dep.split('/')[0];
    const browser = typeof pkg.browser === 'object' ? pkg.browser : typeof pkg.browserify === 'object' ? pkg.browserify : {};
    // ignore optional dependencies
    return (helpers.isRelative(dep) ||
            root in deps ||
            browser[root] && browser[root] in deps ||
            root === currRoot ||
            root in shims.fileShims ||
            shims.emptyShims.indexOf(root) !== -1);
  };
};

const envify = (source, map) => {
  if (source.indexOf('process.env.') !== -1) {
    return Object.keys(map).reduce((newSource, key) => {
      const regexp = new RegExp('process\\.env\\.' + key, 'g');
      return newSource.replace(regexp, `'${map[key]}'`);
    }, source);
  } else {
    return source;
  }
};

let fList;

const tryUnlink = (path, files) => {
  files.forEach(p => {
    fList.emit('unlink', p);
  });
};

const onUnlink = depGraph => path => {
  const unFiles = depGraph.unlink(path);
  tryUnlink(path, unFiles);
};

const depsFor = (fileReflection, rootPackage) => {
  const isVendor = fileReflection.isVendor;
  const isPackage = fileReflection.isPackage;
  const isApp = fileReflection.isApp;

  return (path, source) => {
    const allDeps = isVendor(path) ? [] : detective(source).filter(x => x && x.length > 0);
    const usesProcess = isVendor(path) ? false : shims.shouldIncludeProcess(source);
    const deps = isApp(path) ? allDeps.filter(x => !helpers.isRelative(x)) : isPackage(path) ? allDeps.filter(shouldIncludeDep(rootPackage, path)) : allDeps;
    if (usesProcess) deps.push('process');
    return deps;
  };
};

const exploreDeps = (npmConfig, fileReflection, browserResolve) => fileList => {
  if (fList !== fileList) {
    fList = fileList;
    fileList.on('unlink', onUnlink(npmConfig.depGraph));
  }

  const depGraph = npmConfig.depGraph;
  const modMap = npmConfig.modMap;
  const usedShims = npmConfig.usedShims;
  const rootPackage = npmConfig.rootPackage;
  const isProduction = npmConfig.isProduction;

  const getDeps = depsFor(fileReflection, rootPackage);
  const shouldNotProcess = path => !isJs(fileList, path) || path.indexOf('.json') !== -1;

  const transform = sourceFile => {
    const source = envify(sourceFile.compiled, {NODE_ENV: isProduction ? 'production' : 'development'});
    Object.assign(sourceFile, {compiled: source});
    return sourceFile;
  };

  return sourceFile => {
    if (!sourceFile) return;
    const path = sourceFile.path;

    if (shouldNotProcess(path)) return Promise.resolve(sourceFile);

    sourceFile = transform(sourceFile);

    const deps = getDeps(path, sourceFile.compiled);

    modMap.add(path);
    if (depGraph.fileModsNotChanged(path, deps)) return Promise.resolve(sourceFile);
    depGraph.addFileMods(path, deps);

    const resPath = sysPath.resolve(path);
    const res = (i, cb) => browserResolve(i, {filename: resPath}, cb);
    return each(deps, res).then(fullPaths => {
      const relPaths = fullPaths.filter(not(shims.isSimpleShim)).map(helpers.makeRelative);
      const fileShims = fullPaths.filter(shims.isShim).map(shims.actualShimName);

      const files = depGraph.getFilesToUnlink(path, depGraph.getFilesToCheckUnlink(path, relPaths));
      tryUnlink(path, files);

      depGraph.addFileFiles(path, relPaths);
      if (fileShims.length) {
        usedShims.addShims(fileShims);
      }
      // dynamically add dependent package files to the watcher list
      relPaths.forEach(p => {
        if (!fileList.find(p)) {
          fileList.watcher.changeFileList(p, false);
        }
      });

      return sourceFile;
    }, err => {
      depGraph.removeFileMods(path);
      return Promise.reject(err);
    });
  };
};

module.exports = exploreDeps;
