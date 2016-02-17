'use strict';

const sysPath = require('path');
const each = require('async-each');
const detective = require('detective');
const mediator = require('../mediator');
const shims = require('./shims');
const helpers = require('./helpers');
const xBrowserResolve = require('./resolve');

const not = helpers.not;

const fileModMap = {};
const fileFileMap = {};

const addFileMods = (file, mods) => fileModMap[file] = mods;
const addFileFiles = (file, files) => fileFileMap[file] = files;

const getFileFiles = file => fileFileMap[file] || [];
const getFilesToCheckUnlink = (file, files) => getFileFiles(file).filter(x => files.indexOf(x) === -1);

const referrals = file => Object.keys(fileFileMap).filter(r => getFileFiles(r).indexOf(file) !== -1);

const removeFileMods = file => delete fileModMap[file];
const removeFileFiles = file => delete fileFileMap[file];

const fileModsNotChanged = (file, mods) => {
  const curr = fileModMap[file];
  if (!curr || curr.length !== mods.length) return false;

  return curr.join(',') === mods.join(',');
};

const isJs = (fileList, path) => fileList.find(path).type === 'javascript';

const isVendor = helpers.isVendor;
const isApp = helpers.isApp;

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
  const fileList = fList;
  const filesToUnlink = files.filter(f => {
    const refs = referrals(f);
    return refs.length === 1 && refs[0] === path || refs.length === 0;
  });

  filesToUnlink.forEach(p => {
    fileList.emit('unlink', p);
  });
};

const onUnlink = path => {
  if (!mediator.npmIsEnabled) return;

  const files = getFileFiles(path);

  removeFileMods(path);
  removeFileFiles(path);

  tryUnlink(path, files);
};

const exploreDeps = fileList => {
  if (!fList) {
    fList = fileList;
    fileList.on('unlink', onUnlink);
  }
  return x => {
    if (!x) return;
    const path = x.path;
    const source = envify(x.compiled, {NODE_ENV: mediator.isProduction ? 'production' : 'development'});
    Object.assign(x, {compiled: source});

    if (!isJs(fileList, path) || !mediator.npmIsEnabled) return Promise.resolve(x);
    if (path.indexOf('.json') !== -1) return Promise.resolve(x);

    const allDeps = isVendor(path) ? [] : detective(source);
    const usesProcess = isVendor(path) ? false : shims.shouldIncludeProcess(source);
    const deps = isApp(path) ? allDeps.filter(x => !helpers.isRelative(x)) : allDeps;

    const resPath = sysPath.resolve(path);
    const res = (i, cb) => xBrowserResolve.resolve(i, {filename: resPath}, cb);

    xBrowserResolve.addToModMap(path);

    return new Promise((resolve, reject) => {
      if (fileModsNotChanged(path, deps)) return resolve(x);

      addFileMods(path, deps);

      each(deps, res, (err, fullPaths) => {
        if (err) {
          removeFileMods(path);
          return reject(err);
        }

        if (usesProcess) {
          fullPaths.push(shims.fileShims.process);
        }

        const relPaths = fullPaths.filter(not(shims.isSimpleShim)).map(helpers.makeRelative);
        const fileShims = fullPaths.filter(shims.isShim).map(shims.actualShimName);

        const files = getFilesToCheckUnlink(path, relPaths);
        tryUnlink(path, files);

        addFileFiles(path, relPaths);
        if (fileShims.length) {
          shims.addShims(fileShims);
        }
        // dynamically add dependent package files to the watcher list
        relPaths.forEach(p => {
          if (!fileList.find(p)) {
            fileList.watcher.changeFileList(p, false);
          }
        });
        resolve(x);
      });
    });
  };
};

module.exports = exploreDeps;
module.exports.addFileMods = addFileMods;
module.exports.addFileFiles = addFileFiles;
