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

const nodeMods = require('node-browser-modules');

const emptyShims = nodeMods.emptyShims;
const fileShims = nodeMods.fileShims;

const fileShimPaths = Object.keys(fileShims).map(x => fileShims[x]);

const dir = sysPath.dirname(sysPath.dirname(require.resolve('.')));

exports.isNpm = path => {
  if (!mediator.npmIsEnabled) return false;
  return path.indexOf('node_modules') >= 0 &&
    !brunchRe.test(path) && path.indexOf('.css') === -1 ||
    path.indexOf(sysPath.dirname(sysPath.dirname(require.resolve('..')))) === 0;

  /* Brunch modules. */
};

exports.isShim = path => path.indexOf(dir) === 0;
const shims = emptyShims.reduce((memo, el) => {
  memo[el] = {};
  return memo;
}, {});

const specialShimFile = '___shims___';

const isSimpleShim = x => x.indexOf(specialShimFile) === 0;
const isFileShim = x => fileShimPaths.indexOf(x) !== -1;
const isActualShim = x => isSimpleShim(x) || isFileShim(x);

const actualShimName = x => {
  if (x.indexOf(specialShimFile) === 0) {
    return x.slice(specialShimFile.length + 1);
  } else {
    return Object.keys(fileShims).find(y => fileShims[y] === x);
  }
};

const not = f => i => !f(i);

const uniq = list => {
  return Object.keys(list.reduce((obj, _) => {
    if (!obj[_]) obj[_] = true;
    return obj;
  }, {}));
};

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
const browserMappings = filePath => {
  const pkg = packageJson(filePath);
  const browser = pkg.browser || pkg.browserify;
  if (browser && typeof browser === 'object') {
    return browser;
  } else if (browser) {
    const obj = {};
    const path = sysPath.relative(getModuleRootPath(filePath), getMainFile(filePath));
    obj['./' + path] = './' + sysPath.join('.', browser);
    return obj;
  } else {
    return {};
  }
};

const isRelative = path => path.slice(0, 2) === './' || path.slice(0, 3) === '../';

const globalBrowserMappings = filePath => {
  const brMap = browserMappings(filePath);

  return Object.keys(brMap).filter(not(isRelative)).reduce((newBrMap, key) => {
    const val = brMap[key];
    if (val) {
      newBrMap[key] = isRelative(val) ? generateModuleName(relativeToRoot(filePath, val)) : val;
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

const aliasDef = (target, source) => {
  return `require.register('${target}', function(exports,require,module) {
    module.exports = require('${source}');
  });`;
};

const simpleShimDef = (name, obj) => {
  return `require.register('${name}', function(exports, require, module) {
    module.exports = ${JSON.stringify(obj)};
  });`;
};

const isMain = filePath => getMainFile(filePath) === sysPath.resolve(expandedFilePath(filePath));

const getNewHeader = (moduleName, source, filePath) => {
  const brMap = globalBrowserMappings(filePath);

  const p = filePath.replace(getModuleRootPath(filePath), '').replace('.js', '').split(sysPath.sep).slice(0, -1);
  const p2 = [moduleName].concat(p).join('/');
  const r = isMain(filePath) ?
    "function(n) { return req(n.replace('./', '" + p2 + "/')); }" :
    'req';

  // core-util-is, used by the stream shims, relies on the Buffer global
  const includeBuffer = source.indexOf(' Buffer.') !== -1 || source.indexOf('new Buffer') !== -1;
  const glob = includeBuffer ? `var Buffer = require('buffer').Buffer;\n` : '';

  if (moduleName === 'stream-browserify') moduleName = 'stream';

  const fbModuleName = generateFileBasedModuleName(filePath);
  const includeFbAlias = moduleName === 'readable-stream';
  const fbAlias = aliasDef(fbModuleName, moduleName);

  return `require.register('${moduleName}', function(exports,req,module){
    var require = __makeRequire((${r}), ${JSON.stringify(brMap)});
    ${glob}(function(exports,require,module) {
      ${source}
    })(exports,require,module);
  });${includeFbAlias ? fbAlias : ''}`;
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

const generateFileBasedModuleName = filePath => {
  return slashes(getModuleRootName(filePath) + filePath.replace(getModuleRootPath(filePath), '').replace('.js', ''));
};

const isDir = fileOrDir => {
  var result;
  try {
    result = fs.lstatSync(fileOrDir).isDirectory();
  } catch (e) { result = false; }
  return result;
};

const _mainFile = (root, json) => {
  const depMain = json.main || 'index.js';
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
let packages = {};
let conventions = {};
let paths;
let nameCleaner;

const applyPackageOverrides = pkg => {
  const pkgOverride = overrides[pkg.name];

  if (pkgOverride) {
    pkg = deepExtend(pkg, pkgOverride);
  }

  return pkg;
};
const getDepPackageJson = depPath => {
  const depJson = require(sysPath.join(depPath, 'package.json'));
  applyPackageOverrides(depJson);
  return depJson;
};

const aliasedFileShims = Object.keys(fileShims).reduce((acc, shim) => {
  const actualMod = generateModuleName(fileShims[shim]);
  if (shim !== actualMod) {
    acc[shim] = actualMod;
  }
  return acc;
}, {});

const globalPseudofile = '___globals___';

const resolveErrorRe = /Cannot find module '(.+)' from '(.+)'/;

const xBrowserResolve = (mod, opts, cb) => {
  Object.assign(opts, {packageFilter: applyPackageOverrides});
  browserResolve(mod, opts, (err, res) => {
    if (err) {
      if (resolveErrorRe.test(err.message)) {
        const data = err.message.match(resolveErrorRe);
        const mod = data[1];
        const src = data[2];
        const topLevel = getModuleRootName(mod);
        const isGlob = opts.filename === globalPseudofile;
        err = isGlob ? `Could not load global module '${mod}'.` : `Could not load module '${mod}' from '${src}'.`;

        if (packages[topLevel] == null) {
          err += ` Possible solution: add '${topLevel}' to package.json and \`npm install\`.`;
        } else {
          if (overrides[mod]) {
            err += ' Possible solution: run `npm install` and check your overrides in package.json.';
          } else {
            err += ' Possible solution: run `npm install`.';
          }
        }
      }
      err = new Error(err);
      err.code = 'Resolving deps';
      return cb(err);
    }
    cb(null, res);
  });
};

const brunchRe = /brunch/;
const loadInit = (config, json) => new Promise((resolve, reject) => {
  conventions = config.conventions;
  overrides = json.overrides || {};
  packages = json.dependencies || {};
  nameCleaner = config.modules.nameCleaner;
  paths = config.paths;

  const rootPath = sysPath.resolve(paths.root);

  const globals = config.npm.globals || {};
  const styles = config.npm.styles || {};

  const res = (i, cb) => xBrowserResolve(i, {filename: globalPseudofile}, cb);

  buildModMap().then(() => {
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
});

const insertGlobals = (config, root) => {
  const globals = Object.assign({}, config.npm.globals || {});

  Object.keys(globals).forEach(glob => {
    root.add(`window.${glob} = require('${globals[glob]}');`);
  });
};

const needsProcessing = file => file.path.indexOf('node_modules') !== -1 &&
  file.path.indexOf('.js') !== -1 &&
  !brunchRe.test(file.path) ||
  exports.isNpm(file.path);

const processFiles = (config, root, files, processor) => {
  const shimAliases = usedShims.reduce((acc, x) => {
    if (aliasedFileShims[x]) {
      acc[x] = aliasedFileShims[x];
    }
    return acc;
  }, {});

  const usesProcess = usedShims.indexOf('process') !== -1;
  const _aliases = Object.assign({}, config.npm.aliases || {}, shimAliases, usesProcess ? {'process/browser': 'process'} : {});

  const aliases = Object.keys(_aliases).map(target => {
    if (target === 'stream') return '';
    return aliasDef(target, _aliases[target]);
  });

  const shimDefs = usedShims.filter(x => shims[x]).map(shim => {
    return simpleShimDef(shim, shims[shim]);
  });

  const processUsed = usedShims.indexOf('process') !== -1;
  root.add(`(function() {
    var global = window;
    ${shimDefs.join('\n')}${processUsed ? '\nvar process;' : ''}

    var __makeRequire = function(r, __brmap) {
      return function(name) {
        if (__brmap[name] !== undefined) name = __brmap[name];
        name = name.replace(".js", "");
        return r(name);
      }
    };
  `);
  files.forEach(processor);
  root.add(aliases.join('\n'));
  if (processUsed) {
    root.add("process = require('process');");
  }
  root.add('})();');

  insertGlobals(config, root);
};

const fileModMap = {};
const fileFileMap = {};
let usedShims = [];

const addFileMods = (file, mods) => fileModMap[file] = mods;
const addFileFiles = (file, files) => fileFileMap[file] = files;

const addShims = shims => usedShims = uniq(usedShims.concat(shims));

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

    const shimModMap = Object.keys(shims).filter(x => packages[x] == null).reduce((acc, shim) => {
      acc[shim] = specialShimFile + '/' + shim;
      return acc;
    }, {});

    const shimFileMap = Object.keys(fileShims).filter(x => packages[x] == null).reduce((acc, shim) => {
      acc[shim] = fileShims[shim];
      return acc;
    }, {});

    modMap = Object.assign({}, modMap0, shimModMap, shimFileMap);
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
    const usesProcess = isVendor(path) ? false : x.compiled.indexOf('process.') !== -1;
    const deps = isApp(path) ? allDeps.filter(x => !isRelative(x)) : allDeps;

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
          fullPaths.push(fileShims.process);
        }

        const relPaths = fullPaths.filter(not(isSimpleShim)).map(makeRelative);
        const shims = fullPaths.filter(isActualShim).map(actualShimName);

        if (deps.indexOf('util') !== -1) relPaths.push(makeRelative(fileShims.util));

        //const origPaths = getFileFiles(path);
        addFileFiles(path, relPaths);
        if (shims.length) {
          addShims(shims);
        }
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
  };
};

exports.exploreDeps = exploreDeps;
exports.wrapInModule = wrapInModule;
exports.loadInit = loadInit;
exports.needsProcessing = needsProcessing;
exports.processFiles = processFiles;
