'use strict';
const sysPath = require('path');
const fs = require('fs');
const detective = require('detective');
const browserResolve = require('browser-resolve');
const each = require('async-each');
const deepExtend = require('./helpers').deepExtend;
const mediator = require('./mediator');
const glob = require('glob');
const promisify = require('./helpers').promisify;

const specialShims = { process: { env: { NODE_ENV: process.env.NODE_ENV } } };
const emptyShims = [
  'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
  'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode',
  'querystring', 'readline', 'repl', 'string_decoder', 'tls', 'tty', 'url',
  'util', 'vm', 'zlib'
];
const shims = Object.assign(emptyShims.reduce((memo, el) => {
  memo[el] = {};
  return memo;
}, {}), specialShims);

const specialShimFile = '___shims___';

const shimModMap = Object.keys(shims).reduce((acc, shim) => {
  acc[shim] = specialShimFile;
  return acc;
}, {});

const not = f => i => !f(i);

const readFile = (path, callback) => fs.readFile(path, {encoding: 'utf8'}, callback);

const getModuleRootPath = path => {
  const split = path.split(sysPath.sep);
  const index = split.lastIndexOf('node_modules');
  return split.slice(0, index + 2).join(sysPath.sep);
};

const getModuleRootName = path => {
  const split = path.split(sysPath.sep);
  const index = split.lastIndexOf('node_modules');
  return split[index + 1];
};

const relativeToRoot = (filePath, relPath) => sysPath.join(
  getModuleRootPath(filePath), relPath
);
const packageJson = filePath => getDepPackageJson(
  getModuleRootPath(filePath)
);
const browserMappings = filePath => packageJson(filePath).browser || {};

const isRelative = path => path.slice(0, 2) === './';

const globalBrowserMappings = filePath => {
  const brMap = browserMappings(filePath);

  return Object.keys(brMap).filter(not(isRelative)).reduce((newBrMap, key) => {
    const val = brMap[key];
    if (val) {
      newBrMap[key] = generateModuleName(relativeToRoot(filePath, val));
    }
    return newBrMap;
  }, {});
};

const expandedFilePath = filePath => {
  const brMap = browserMappings(filePath);

  Object.keys(brMap).filter(isRelative).forEach(key => {
    const val = brMap[key];
    if (val && filePath === relativeToRoot(filePath, val)) {
      filePath = relativeToRoot(filePath, key);
    }
  });

  return filePath;
};

const isMain = filePath => getMainFile(filePath) === filePath;

const getNewHeader = (moduleName, source, filePath) => {
  const brMap = globalBrowserMappings(filePath);

  const p = filePath.replace(getModuleRootPath(filePath), '').replace('.js', '').split('/').slice(0, -1);
  const p2 = [moduleName].concat(p).join('/');
  const r = isMain(filePath) ?
    "function(n) { return req(n.replace('./', '" + p2 + "/')); }" :
    'req';

  return `require.register('${moduleName}', function(exports,req,module){
    var require = __makeRequire((${r}), ${JSON.stringify(brMap)});
    ${source}
  });`;
};

const generateModule = (filePath, source) => {
  const expandedPath = expandedFilePath(filePath);
  const mn = generateModuleName(expandedPath);

  return getNewHeader(mn, source, expandedPath);
};

const slashes = string => string.replace(/\\/g, '/');

const generateModuleName = filePath => {
  const rp = getModuleRootPath(filePath);
  const mn = getModuleRootName(filePath) +
    (isMain(filePath) ? '' : filePath.replace(rp, '').replace('.js', ''));

  return slashes(mn);
};

const isDir = fileOrDir => {
  var result;
  try {
    result = fs.lstatSync(fileOrDir).isDirectory();
  } catch (e) { result = false; }
  return result;
};

const _mainFile = (root, json) => {
  const depMain = typeof json.browserify === 'string' ? json.browserify : typeof json.browser === 'string' ?
    json.browser : json.main || 'index.js';
  const fileOrDir = sysPath.join(root, depMain);
  if (isDir(fileOrDir)) {
    return sysPath.join(fileOrDir, 'index.js');
  } else {
    return fileOrDir.indexOf('.js') === -1 ? fileOrDir + '.js' : fileOrDir;
  }
};

const getMainFile = filePath => {
  const root = getModuleRootPath(filePath);
  const json = packageJson(filePath);

  return _mainFile(root, json);
};

const wrapInModule = (filePath, opts) => new Promise((resolve, reject) => {
  if (opts == null) opts = {};
  if (opts.paths == null) {
    const ref = process.env.NODE_PATH;
    opts.paths = (ref != null ? ref.split(':') : void 0) || [];
  }
  if (opts.basedir == null) opts.basedir = process.cwd();

  filePath = sysPath.resolve(opts.basedir, filePath);

  return readFile(filePath, (err, src) => {
    if (err) return reject(err);
    resolve(generateModule(filePath, src));
  });
});

let overrides = {};
let conventions = {};
let paths;
let nameCleaner;

const getDepPackageJson = depPath => {
  const dep = getModuleRootName(depPath);
  let depJson = require(sysPath.join(depPath, 'package.json'));
  if (overrides[dep]) {
    depJson = deepExtend(depJson, overrides[dep]);
  }
  return depJson;
};

const brunchRe = /brunch/;
const globalPseudofile = '___globals___';
const loadInit = (config, json) => new Promise((resolve, reject) => {
  conventions = config.conventions;
  overrides = json.overrides || {};
  nameCleaner = config.modules.nameCleaner;
  paths = config.paths;

  const rootPath = sysPath.resolve(paths.root);

  const globals = config.npm.globals || {};
  const styles = config.npm.styles || {};

  const res = (i, cb) => browserResolve(i, {filename: 'index.js'}, cb);

  const globModules = Object.keys(globals).map(k => globals[k]);
  each(globModules, res, (err, fullPaths) => {
    if (err) return reject(err);

    addFileMods(globalPseudofile, globModules);
    addFileFiles(globalPseudofile, fullPaths.map(makeRelative));

    const styleComps = Object.keys(styles).map(pkg => {
      const stylesheets = styles[pkg];
      const root = sysPath.join(rootPath, 'node_modules', pkg);

      return {
        component: pkg,
        files: stylesheets.map(style => sysPath.join(root, style))
      };
    });

    const globComps = [{
      component: globalPseudofile,
      files: fullPaths.map(makeRelative)
    }];

    resolve({ components: styleComps.concat(globComps) });
  });
});

const insertGlobals = (config, root) => {
  const globals = config.npm.globals || {};

  Object.keys(globals).forEach(glob => {
    root.add(`window.${glob} = require('${globals[glob]}');`);
  });
};

const needsProcessing = file => file.path.indexOf('node_modules') !== -1 &&
  file.path.indexOf('.js') !== -1 &&
  !brunchRe.test(file.path);

const processFiles = (config, root, files, processor) => {
  const shimSts = Object.keys(shims).map(shim => {
    const val = shims[shim];
    const safe = typeof val === 'string' ? val : JSON.stringify(val);
    return `${shim}: (${safe})`;
  });

  const aliases = Object.keys(config.npm.aliases || []).map(target => {
    const source = config.npm.aliases[target];

    return `require.register("${target}", function(exports, require, module) {
      module.exports = require("${source}");
    });`;
  });

  const items = JSON.stringify(Object.keys(shims));
  root.add(`(function() {
    var global = window;
    var __shims = {${shimSts.join(',')}};
    var process = __shims.process;

    var __makeRequire = function(r, __brmap) {
      return function(name) {
        if (__brmap[name] !== undefined) name = __brmap[name];
        name = name.replace(".js", "");
        return ${items}.indexOf(name) === -1 ? r(name) : __shims[name];
      }
    };
  `);
  files.forEach(processor);
  root.add(aliases.join());
  root.add('})();');

  insertGlobals(config, root);
};

const fileModMap = {};
const fileFileMap = {};

const addFileMods = (file, mods) => fileModMap[file] = mods;
const addFileFiles = (file, files) => fileFileMap[file] = files;

const removeFileMods = file => delete fileModMap[file];

//const referrals = file => {
  //return Object.keys(fileFileMap).filter(k => fileFileMap[k].indexOf(file) !== -1);
//};
//const getRemovedFiles = (origPaths, newPaths) => {
  //if (!origPaths) return [];
  //const removedPaths = origPaths.filter(x => newPaths.indexOf(x) === -1 && !isApp(x));
  //const reallyRemovedPaths = removedPaths.filter(x => referrals(x).length === 0);
  //return reallyRemovedPaths;
//};

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
  const topPaths = paths.watched.join(',');
  return promisify(glob)(`{${topPaths}}/**/*`).then(mods => {
    const modMap0 = mods.reduce((map, mod) => {
      const name = nameCleaner(mod.split('.').slice(0, -1).join('.'));
      map[name] = mod;
      return map;
    }, {});

    modMap = Object.assign({}, modMap0, shimModMap);
  });
};

const isJs = (fileList, path) => fileList.find(path).type === 'javascript';

const packageRe = /node_modules/;
const isPackage = path => packageRe.test(path);
const isVendor = path => isPackage(path) ? false : conventions.vendor.test(path);
const isApp = path => !conventions.vendor.test(path);

const makeRelative = path => path.replace(process.cwd() + sysPath.sep, '');

const exploreDeps = fileList => {
  return x => {
    const path = x.path;

    if (!isJs(fileList, path) || !mediator.npmIsEnabled) return Promise.resolve(x);

    const allDeps = isVendor(path) ? [] : detective(x.compiled);
    const deps = isApp(path) ? allDeps.filter(x => !isRelative(x)) : allDeps;

    if (!modMap) buildModMap();

    const res = (i, cb) => browserResolve(i, { filename: path, modules: modMap }, cb);

    return buildModMap().then(() => {
      return new Promise((resolve, reject) => {
        if (fileModsNotChanged(path, deps)) return resolve(x);

        addFileMods(path, deps);

        each(deps, res, (err, fullPaths) => {
          if (err) {
            removeFileMods(path);
            return reject(err);
          }

          const relPaths = fullPaths.filter(x => x !== specialShimFile).map(makeRelative);
          //const origPaths = getFileFiles(path);
          addFileFiles(path, relPaths);
          // dynamically add dependent package files to the watcher list
          // deppack should also remove npm package files from the watcher list if the dep is no longer being required
          // the above above does not work for some reason ([TypeError: Cannot assign to read only property 'path' of #<SourceFile>])
          //const removedFiles = getRemovedFiles(origPaths, fullPaths);
          //removedFiles.forEach(p => fileList.emit('unlink', p));
          relPaths.forEach(p => {
            if (!fileList.find(p)) {
              fileList.watcher.changeFileList(p, false);
            }
          });
          resolve(x);
        });
      });
    });
  };
};

exports.exploreDeps = exploreDeps;
exports.wrapInModule = wrapInModule;
exports.loadInit = loadInit;
exports.needsProcessing = needsProcessing;
exports.processFiles = processFiles;
