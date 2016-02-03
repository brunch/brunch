'use strict';

const sysPath = require('path');
const glob = require('glob');
const each = require('async-each');
const detective = require('detective');
const promisify = require('../helpers').promisify;
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

let modMap;

const buildModMap = () => {
  if (modMap) return Promise.resolve();

  // this is needed to not throw on app-wise requires
  // note that fileList.files can't be used because it's not fully populated until the first compilation
  const topPaths = mediator.paths.watched.join(',');
  return promisify(glob)(`{${topPaths}}/**/*`).then(mods => {
    const modMap0 = mods.reduce((map, mod) => {
      const name = mediator.nameCleaner(mod.split('.').slice(0, -1).join('.'));
      map[name] = mod;
      return map;
    }, {});

    const shimModMap = shims.emptyShims.filter(x => mediator.packages[x] == null).reduce((acc, shim) => {
      acc[shim] = shims.makeSpecialShimFname(shim);
      return acc;
    }, {});

    const shimFileMap = Object.keys(shims.fileShims).filter(x => mediator.packages[x] == null).reduce((acc, shim) => {
      acc[shim] = shims.fileShims[shim];
      return acc;
    }, {});

    modMap = Object.assign({}, modMap0, shimModMap, shimFileMap);
  });
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
    const res = (i, cb) => xBrowserResolve(i, {filename: resPath, modules: modMap}, cb);

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
module.exports.buildModMap = buildModMap;
module.exports.addFileMods = addFileMods;
module.exports.addFileFiles = addFileFiles;
