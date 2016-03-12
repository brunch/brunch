'use strict';

const sysPath = require('path');
const promisify = require('micro-promisify');
const each = promisify(require('async-each'));
const detective = require('detective');

const shims = require('./shims');
const helpers = require('./helpers');

const isJs = (fileList, path) => fileList.find(path).type === 'javascript';

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

const depsFor = (fileReflection, canCallDep) => {
  const isVendor = fileReflection.isVendor;
  const isPackage = fileReflection.isPackage;
  const isApp = fileReflection.isApp;

  return (path, source) => {
    const allDeps = isVendor(path) ? [] : detective(source).filter(x => x && x.length > 0);
    const usesProcess = isVendor(path) ? false : shims.shouldIncludeProcess(source);
    const deps = isApp(path) ? allDeps.filter(x => !helpers.isRelative(x)) : isPackage(path) ? allDeps.filter(canCallDep(path)) : allDeps;
    if (usesProcess) deps.push('process');
    return deps;
  };
};

const exploreDeps = (depGraph, modMap, usedShims, canCallDep, isProduction, fileReflection, browserResolve) => fileList => {
  if (fList !== fileList) {
    fList = fileList;
    fileList.on('unlink', onUnlink(depGraph));
  }

  const getDeps = depsFor(fileReflection, canCallDep);
  const shouldNotProcess = path => !isJs(fileList, path) || /\.json$/.test(path);

  const transform = sourceFile => {
    const source = envify(sourceFile.compiled, {NODE_ENV: isProduction ? 'production' : 'development'});
    Object.assign(sourceFile, {compiled: source});
    return sourceFile;
  };

  return sourceFile => {
    if (!sourceFile) return;
    const path = sourceFile.path;

    if (shouldNotProcess(path)) return Promise.resolve(sourceFile);
    modMap.add(path);

    sourceFile = transform(sourceFile);

    const deps = getDeps(path, sourceFile.compiled);

    if (depGraph.fileModsNotChanged(path, deps)) return Promise.resolve(sourceFile);
    depGraph.addFileMods(path, deps);

    const resPath = sysPath.resolve(path);
    const res = (i, cb) => browserResolve(i, {filename: resPath}, cb);
    return each(deps, res).then(fullPaths => {
      const relPaths = fullPaths.filter(helpers.not(shims.isSimpleShim)).map(helpers.makeRelative);
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
