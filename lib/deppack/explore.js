'use strict';

const sysPath = require('path');
const each = require('async-each');
const detective = require('detective');

const moduleNaming = require('./module-naming');
const shims = require('./shims');
const helpers = require('./helpers');
const xBrowserResolve = require('./resolve');

const not = helpers.not;

const addFileMods = (npmConfig, file, mods) => npmConfig.fileModMap[file] = mods;
const addFileFiles = (npmConfig, file, files) => npmConfig.fileFileMap[file] = files;

const getFileFiles = (npmConfig, file) => npmConfig.fileFileMap[file] || [];
const getFilesToCheckUnlink = (npmConfig, file, files) => getFileFiles(npmConfig, file).filter(x => files.indexOf(x) === -1);

const referrals = (npmConfig, file) => Object.keys(npmConfig.fileFileMap).filter(r => getFileFiles(npmConfig, r).indexOf(file) !== -1);

const removeFileMods = (npmConfig, file) => delete npmConfig.fileModMap[file];
const removeFileFiles = (npmConfig, file) => delete npmConfig.fileFileMap[file];

const fileModsNotChanged = (npmConfig, file, mods) => {
  const curr = npmConfig.fileModMap[file];
  if (!curr || curr.length !== mods.length) return false;

  return curr.join(',') === mods.join(',');
};

const isJs = (fileList, path) => fileList.find(path).type === 'javascript';

const shouldIncludeDep = (npmConfig, path) => {
  const currRoot = moduleNaming.getModuleRootName(path);
  const pkg = helpers.packageJson(sysPath.resolve(path), npmConfig);
  const deps = Object.assign({}, pkg.dependencies || {}, pkg.peerDependencies || {});
  return dep => {
    const root = dep.split('/')[0];
    const browser = typeof pkg.browser === 'object' ? pkg.browser : typeof pkg.browserify === 'object' ? pkg.browserify : {};
    // ignore optional dependencies
    return (helpers.isRelative(dep) || root in deps || browser[root] && browser[root] in deps || root === currRoot || root in shims.fileShims || shims.emptyShims.indexOf(root) !== -1);
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

const tryUnlink = (npmConfig, path, files) => {
  const fileList = fList;
  const filesToUnlink = files.filter(f => {
    const refs = referrals(npmConfig, f);
    return refs.length === 1 && refs[0] === path || refs.length === 0;
  });

  filesToUnlink.forEach(p => {
    fileList.emit('unlink', p);
  });
};

const onUnlink = npmConfig => path => {
  const files = getFileFiles(npmConfig, path);

  removeFileMods(npmConfig, path);
  removeFileFiles(npmConfig, path);

  tryUnlink(npmConfig, path, files);
};

const exploreDeps = npmConfig => fileList => {
  if (fList !== fileList) {
    fList = fileList;
    if (npmConfig.npmIsEnabled) fileList.on('unlink', onUnlink(npmConfig));
  }

  const isVendor = helpers.isVendor(npmConfig);
  const isPackage = helpers.isPackage(npmConfig);
  const isApp = helpers.isApp(npmConfig);

  return x => {
    if (!x) return;
    const path = x.path;

    if (!isJs(fileList, path) || !npmConfig.npmIsEnabled) return Promise.resolve(x);
    if (path.indexOf('.json') !== -1) return Promise.resolve(x);

    const source = envify(x.compiled, {NODE_ENV: npmConfig.isProduction ? 'production' : 'development'});
    Object.assign(x, {compiled: source});

    const allDeps = isVendor(path) ? [] : detective(source);
    const usesProcess = isVendor ? false : shims.shouldIncludeProcess(source);
    const deps1 = isApp(path) ? allDeps.filter(x => !helpers.isRelative(x)) : isPackage(path) ? allDeps.filter(shouldIncludeDep(npmConfig, path)) : allDeps;
    const deps = deps1.filter(d => d.length !== 0);

    const resPath = sysPath.resolve(path);
    const res = (i, cb) => xBrowserResolve.resolve(npmConfig, i, {filename: resPath}, cb);

    xBrowserResolve.addToModMap(npmConfig, path);

    return new Promise((resolve, reject) => {
      if (fileModsNotChanged(npmConfig, path, deps)) return resolve(x);

      addFileMods(npmConfig, path, deps);

      each(deps, res, (err, fullPaths) => {
        if (err) {
          removeFileMods(npmConfig, path);
          return reject(err);
        }

        if (usesProcess) {
          fullPaths.push(shims.fileShims.process);
        }

        const relPaths = fullPaths.filter(not(shims.isSimpleShim)).map(helpers.makeRelative);
        const fileShims = fullPaths.filter(shims.isShim).map(shims.actualShimName);

        const files = getFilesToCheckUnlink(npmConfig, path, relPaths);
        tryUnlink(npmConfig, path, files);

        addFileFiles(npmConfig, path, relPaths);
        if (fileShims.length) {
          shims.addShims(npmConfig, fileShims);
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
