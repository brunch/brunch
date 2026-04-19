'use strict';

const sysPath = require('./path');
const browserResolve = require('browser-resolve');
const trueCasePath_ = require('true-case-path');
const glob = require('util').promisify(require('glob'));
const moduleNaming = require('./module-naming');
const packages = require('./packages');
const shims = require('./shims');

const normalizePath = (path) => path.split(sysPath.sep).join('/');
const trueCasePath = (path) => normalizePath(trueCasePath_(path));

const noPackage = rootPackage => x => rootPackage.dependencies[x] == null;

const buildModMap = (modMap, watchedPaths, rootPackage) => {
  let topPaths = watchedPaths.join(',');
  if (watchedPaths.length > 1) {
    topPaths = `{${topPaths}}`;
  }
  return glob(`${topPaths}/**/*`).then(mods => {
    mods.forEach(mod => {
      modMap.add(mod);
    });

    const shimModMap = shims.emptyShims.filter(noPackage(rootPackage)).reduce((acc, shim) => {
      acc[shim] = shims.makeSpecialShimFname(shim);
      return acc;
    }, {});

    const shimFileMap = Object.keys(shims.fileShims).filter(noPackage(rootPackage)).reduce((acc, shim) => {
      acc[shim] = shims.fileShims[shim];
      return acc;
    }, {});

    modMap.addMany(shimModMap);
    modMap.addMany(shimFileMap);
  });
};

const friendlyRequireError = (rootPackage, globalPseudofile, mod, opts, err) => {
  const topLevel = moduleNaming.getModuleRootName(mod);
  const data = /^Cannot find module '(.+)' from '(.+)'/.exec(err.message);
  let msg = err.message;
  let code = 'DEPS_RESOLVE_FAILED';
  if (data) {
    const mod = data[1];
    const src = data[2];
    const isGlobal = opts.filename === globalPseudofile;

    msg = isGlobal ?
      `Could not load global module '${mod}'.` :
      `Could not load module '${mod}' from '${src}'.`;

    if (topLevel === '.' || topLevel === '..') {
      msg += ' Make sure the file actually exists.';
    } else if (noPackage(rootPackage)(topLevel)) {
      msg += ` Possible solution: add '${topLevel}' to package.json and \`npm install\`.`;
    } else {
      if (rootPackage.overrides[mod]) {
        msg += ' Possible solution: run `npm install` and check your overrides in package.json.';
      } else {
        msg += ' Possible solution: run `npm install`.';
      }
      code = 'DEPS_RESOLVE_INSTALL';
    }
  }

  err = new Error(msg);
  err.code = code;
  return err;
};

const checkImproperCase = (mod, opts, res) => {
  if (shims.isSimpleShim(res) || res === trueCasePath(res)) return;

  const err = new Error(`Improperly-cased require: '${mod}' in ${opts.filename}`);
  err.code = 'DEPS_RESOLVE_CASE';
  throw err;
};

const resolve = (rootPackage, modMap, aliases, globalPseudofile) => (mod, opts, cb) => {
  const packageFilter = pkg => packages.applyPackageOverrides(pkg, rootPackage);
  const modules = modMap.toHash();
  const extensions = ['.js', '.json'].concat(modMap.extensions().map(x => '.' + x));
  Object.assign(opts, {packageFilter, modules, extensions});
  mod = aliases && aliases[mod] || mod;
  browserResolve(mod, opts, (err, res) => {
    if (err) {
      return cb(friendlyRequireError(rootPackage, globalPseudofile, mod, opts, err));
    }

    try {
      const normRes = normalizePath(res);
      checkImproperCase(mod, opts, normRes);
      return cb(null, normRes);
    } catch (err2) {
      if (err2 instanceof TypeError) {
        return cb(new Error(`Failed to normalize ${res}`));
      } else {
        return cb(err2);
      }
    }
  });
};

exports.resolve = resolve;
exports.buildModMap = buildModMap;
