'use strict';

const sysPath = require('./path');
const {promisify} = require('util');
const each = promisify(require('async-each'));
const detective = require('detective');
const logger = require('loggy');

const shims = require('./shims');
const helpers = require('./helpers');

const brunchRe = /\-brunch|brunch\-/;
const isJs = (fileList, path) => {
  const file = fileList.files.get(path);
  return file && file.type === 'javascript';
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
  const referrals = depGraph.referrals(path);
  tryUnlink(path, unFiles);
  // if some files are still requiring this deleted file, we should mark them as erroneous
  referrals.forEach(p => {
    depGraph.addFileMods(p, []);
    fList.emit('change', p);
  });
};

const onAdd = () => {
  const errored = Array.from(fList.files.values())
    .filter(x => x.error && (x.error.code || '').startsWith('DEPS_RESOLVE'));
  // if some files previously failed, retry them, as the newly-added file might be why they failed
  errored.forEach(file => fList.emit('change', file.path));
};

const depsFor = (fileReflection, canCallDep, npmConfig) => {
  const isVendor = fileReflection.isVendor;
  const isPackage = fileReflection.isPackage;
  const isApp = fileReflection.isApp;

  return (nameCleaner, path, source) => {
    const allDeps = isVendor(path) ? [] : detective(source).filter(x => x && x.length > 0);
    const usesProcess = npmConfig.detectProcess && !isVendor(path) && shims.shouldIncludeProcess(source);
    let deps;

    if (isApp(path)) {
      deps = allDeps;
    } else if (isPackage(path)) {
      deps = allDeps.filter(canCallDep(path));
    } else {
      deps = allDeps;
    }
    if (usesProcess) deps.push('process');
    return deps;
  };
};

const exploreDeps = (depGraph, modMap, usedShims, canCallDep, isProduction, fileReflection, browserResolve, npmConfig) => fileList => {
  if (fList !== fileList) {
    fList = fileList;
    fileList.on('unlink', onUnlink(depGraph));
    fileList.on('add', onAdd);
  }

  const getDeps = depsFor(fileReflection, canCallDep, npmConfig);
  const shouldNotProcess = path => !isJs(fileList, path) || /\.json$/.test(path);

  const transform = sourceFile => {
    const source = envify(sourceFile.compiled, {NODE_ENV: isProduction ? 'production' : 'development'});
    Object.assign(sourceFile, {compiled: source});
    return sourceFile;
  };

  return sourceFile => {
    if (!sourceFile) return;
    const path = sourceFile.path;

    if (shouldNotProcess(path)) {
      return Promise.resolve(sourceFile);
    }
    modMap.add(path);

    sourceFile = transform(sourceFile);

    const deps = getDeps(modMap.nameCleaner, path, sourceFile.compiled);

    if (depGraph.fileModsNotChanged(path, deps)) return Promise.resolve(sourceFile);
    depGraph.addFileMods(path, deps);

    const resPath = sysPath.resolve(path);
    const res = (i, cb) => browserResolve(i, {filename: resPath}, cb);
    return each(deps, res).then(fullPaths => {
      if (fullPaths.indexOf(path) !== -1) fullPaths.splice(fullPaths.indexOf(path), 1);

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
        if (!fileList.files.has(p)) {
          const isHelper = brunchRe.test(p);
          // brunch plugins are not meant to contain modules
          if (isHelper) {
            logger.warn(`not including '${p}' as a module because it comes from a Brunch plugin`);
            return;
          }
          fileList.emit('change', p);
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
