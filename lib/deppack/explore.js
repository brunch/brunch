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

const removeFileMods = file => delete fileModMap[file];

const fileModsNotChanged = (file, mods) => {
  const curr = fileModMap[file];
  if (!curr || curr.length !== mods.length) return false;

  return curr.join(',') === mods.join(',');
};

const isJs = (fileList, path) => fileList.find(path).type === 'javascript';

const packageRe = /node_modules/;
const isPackage = path => packageRe.test(path);
const isVendor = path => isPackage(path) ? false : mediator.conventions.vendor.test(path);
const isApp = path => !mediator.conventions.vendor.test(path);

const exploreDeps = fileList => {
  return x => {
    if (!x) return;
    const path = x.path;

    if (!isJs(fileList, path) || !mediator.npmIsEnabled) return Promise.resolve(x);

    const allDeps = isVendor(path) ? [] : detective(x.compiled);
    const usesProcess = isVendor(path) ? false : shims.shouldIncludeProcess(x.compiled);
    const deps = isApp(path) ? allDeps.filter(x => !helpers.isRelative(x)) : allDeps;

    const resPath = sysPath.resolve(path);
    const res = (i, cb) => xBrowserResolve(i, {filename: resPath}, cb);

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

        addFileFiles(path, relPaths);
        if (fileShims.length) {
          shims.addShims(fileShims);
        }
        // dynamically add dependent package files to the watcher list
        // deppack should also remove npm package files from the watcher list if the dep is no longer being required but does not, at the moment
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
