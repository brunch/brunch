'use strict';

const sysPath = require('path');
const promisify = require('../helpers').promisify;
const each = promisify(require('async-each'));
const detective = require('detective');

const moduleNaming = require('./module-naming');
const shims = require('./shims');
const helpers = require('./helpers');

const not = helpers.not;
const isRelative = helpers.isRelative;
const makeRelative = helpers.makeRelative;

const isJs = (fileList, path) => fileList.find(path).type === 'javascript';

const shouldIncludeDep = (getPackageJson, path) => {
  const currRoot = moduleNaming.getModuleRootName(path);
  const pkg = getPackageJson(sysPath.resolve(path));
  const deps = Object.assign({}, pkg.dependencies || {}, pkg.peerDependencies || {});
  return dep => {
    const root = dep.split('/')[0];
    const browser = typeof pkg.browser === 'object' ? pkg.browser : typeof pkg.browserify === 'object' ? pkg.browserify : {};
    // ignore optional dependencies
    return (isRelative(dep) ||
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

const depsFor = (fileReflection, getPackageJson) => {
  const isVendor = fileReflection.isVendor;
  const isPackage = fileReflection.isPackage;
  const isApp = fileReflection.isApp;

  return (path, source) => {
    const allDeps = isVendor(path) ? [] : detective(source).filter(x => x && x.length > 0);
    const usesProcess = isVendor(path) ? false : shims.shouldIncludeProcess(source);
    const deps = isApp(path) ? allDeps.filter(x => !isRelative(x)) : isPackage(path) ? allDeps.filter(shouldIncludeDep(getPackageJson, path)) : allDeps;
    if (usesProcess) deps.push('process');
    return deps;
  };
};

const exploreDeps = (depGraph, modMap, usedShims, getPackageJson, isProduction, fileReflection, browserResolve) => fileList => {
  if (fList !== fileList) {
    fList = fileList;
    fileList.on('unlink', onUnlink(depGraph));
  }

  const getDeps = depsFor(fileReflection, getPackageJson);
  const shouldNotProcess = path => !isJs(fileList, path) || /\.json$/.test(path);

  const transform = sourceFile => {
    const source = envify(sourceFile.compiled, {NODE_ENV: isProduction ? 'production' : 'development'});
    Object.assign(sourceFile, {compiled: source});
    return sourceFile;
  };

  return sourceFile => {
    if (!sourceFile) return;
    const path = sourceFile.path;

    modMap.add(path);

    if (shouldNotProcess(path)) return Promise.resolve(sourceFile);

    sourceFile = transform(sourceFile);

    const deps = getDeps(path, sourceFile.compiled);

    if (depGraph.fileModsNotChanged(path, deps)) return Promise.resolve(sourceFile);
    depGraph.addFileMods(path, deps);

    const resPath = sysPath.resolve(path);
    const res = (i, cb) => browserResolve(i, {filename: resPath}, cb);
    return each(deps, res).then(fullPaths => {
      const relPaths = fullPaths.filter(not(shims.isSimpleShim)).map(makeRelative);
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
