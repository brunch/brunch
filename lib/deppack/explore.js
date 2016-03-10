'use strict';

const sysPath = require('path');
const each = require('async-each');
const detective = require('detective');

const moduleNaming = require('./module-naming');
const shims = require('./shims');
const helpers = require('./helpers');
const xBrowserResolve = require('./resolve');

const not = helpers.not;

// not a graph
class DepGraph {
  constructor() {
    this.fileModMap = {};
    this.fileFileMap = {};
  }

  addFileMods(file, mods) {
    this.fileModMap[file] = mods;
  }

  addFileFiles(file, files) {
    this.fileFileMap[file] = files;
  }

  getFileFiles(file) {
    return this.fileFileMap[file] || [];
  }

  getFilesToCheckUnlink(file, files) {
    return this.getFileFiles(file).filter(x => files.indexOf(x) === -1);
  }

  referrals(file) {
    return Object.keys(this.fileFileMap).filter(r => this.getFileFiles(r).indexOf(file) !== -1);
  }

  removeFileMods(file) {
    delete this.fileModMap[file];
  }

  removeFileFiles(file) {
    delete this.fileFileMap[file];
  }

  fileModsNotChanged(file, mods) {
    const curr = this.fileModMap[file];
    if (!curr || curr.length !== mods.length) return false;

    return curr.join(',') === mods.join(',');
  }
}

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

const tryUnlink = (depGraph, path, files) => {
  const fileList = fList;
  const filesToUnlink = files.filter(f => {
    const refs = depGraph.referrals(f);
    return refs.length === 1 && refs[0] === path || refs.length === 0;
  });

  filesToUnlink.forEach(p => {
    fileList.emit('unlink', p);
  });
};

const onUnlink = depGraph => path => {
  const files = depGraph.getFileFiles(path);

  depGraph.removeFileMods(path);
  depGraph.removeFileFiles(path);

  tryUnlink(depGraph, path, files);
};

const depsFor = npmConfig => {
  const isVendor = helpers.isVendor(npmConfig);
  const isPackage = helpers.isPackage(npmConfig);
  const isApp = helpers.isApp(npmConfig);

  return (path, source) => {
    const allDeps = isVendor(path) ? [] : detective(source).filter(x => x && x.length > 0);
    const deps = isApp(path) ? allDeps.filter(x => !helpers.isRelative(x)) : isPackage(path) ? allDeps.filter(shouldIncludeDep(npmConfig.rootPackage, path)) : allDeps;
    return deps;
  };
};

const exploreDeps = npmConfig => fileList => {
  if (fList !== fileList) {
    fList = fileList;
    fileList.on('unlink', onUnlink(npmConfig.depGraph));
  }

  const getDeps = depsFor(npmConfig);
  const isVendor = helpers.isVendor(npmConfig);
  const shouldNotProcess = path => !isJs(fileList, path) || path.indexOf('.json') !== -1;

  return x => {
    if (!x) return;
    const path = x.path;

    if (shouldNotProcess(path)) return Promise.resolve(x);

    const source = envify(x.compiled, {NODE_ENV: npmConfig.isProduction ? 'production' : 'development'});
    Object.assign(x, {compiled: source});

    const deps = getDeps(path, source);
    const usesProcess = isVendor(path) ? false : shims.shouldIncludeProcess(source);

    const resPath = sysPath.resolve(path);
    const res = (i, cb) => xBrowserResolve.resolve(npmConfig, i, {filename: resPath}, cb);

    const depGraph = npmConfig.depGraph;

    npmConfig.modMap.add(path);

    return new Promise((resolve, reject) => {
      if (depGraph.fileModsNotChanged(path, deps)) return resolve(x);

      depGraph.addFileMods(path, deps);

      each(deps, res, (err, fullPaths) => {
        if (err) {
          depGraph.removeFileMods(path);
          return reject(err);
        }

        if (usesProcess) {
          fullPaths.push(shims.fileShims.process);
        }

        const relPaths = fullPaths.filter(not(shims.isSimpleShim)).map(helpers.makeRelative);
        const fileShims = fullPaths.filter(shims.isShim).map(shims.actualShimName);

        const files = depGraph.getFilesToCheckUnlink(path, relPaths);
        tryUnlink(depGraph, path, files);

        depGraph.addFileFiles(path, relPaths);
        if (fileShims.length) {
          npmConfig.usedShims.addShims(fileShims);
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
module.exports.DepGraph = DepGraph;
