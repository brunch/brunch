'use strict';

const browserResolve = require('browser-resolve');
const trueCasePath = require('true-case-path');
const glob = require('micro-promisify')(require('glob'));
const moduleNaming = require('./module-naming');
const packages = require('./packages');
const shims = require('./shims');

const noPackage = rootPackage => x => rootPackage.dependencies[x] == null;

const buildModMap = (modMap, watchedPaths, rootPackage) => {
  const topPaths = watchedPaths.join(',');
  return glob(`{${topPaths}}/**/*`).then(mods => {
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

const resolveErrorRe = /Cannot find module '(.+)' from '(.+)'/;
const friendlyRequireError = (rootPackage, globalPseudofile, mod, opts, err) => {
  const topLevel = moduleNaming.getModuleRootName(mod);
  if (resolveErrorRe.test(err.message)) {
    const data = err.message.match(resolveErrorRe);
    const mod = data[1];
    const src = data[2];
    const isGlob = opts.filename === globalPseudofile;
    err = isGlob ? `Could not load global module '${mod}'.` : `Could not load module '${mod}' from '${src}'.`;

    if (topLevel === '.' || topLevel === '..') {
      err += ' Make sure the file actually exists.';
    } else if (noPackage(rootPackage)(topLevel)) {
      err += ` Possible solution: add '${topLevel}' to package.json and \`npm install\`.`;
    } else {
      if (rootPackage.overrides[mod]) {
        err += ' Possible solution: run `npm install` and check your overrides in package.json.';
      } else {
        err += ' Possible solution: run `npm install`.';
      }
    }
  }

  err = new Error(err);
  err.code = 'Resolving deps';
  return err;
};

const checkImproperCase = (mod, opts, res) => {
  if (res !== trueCasePath(res)) {
    const err = new Error(`Improperly-cased require: '${mod}' in ${opts.filename}`);
    err.code = 'Resolving deps';
    return err;
  }
};

const resolve = (rootPackage, modMap, aliases, globalPseudofile) => (mod, opts, cb) => {
  const packageFilter = pkg => packages.applyPackageOverrides(pkg, rootPackage);
  const modules = modMap.toHash();
  Object.assign(opts, {packageFilter, modules, extensions: ['.js', '.json']});
  mod = aliases && aliases[mod] || mod;
  browserResolve(mod, opts, (err, res) => {
    if (err) {
      return cb(friendlyRequireError(rootPackage, globalPseudofile, mod, opts, err));
    }

    const caseError = checkImproperCase(mod, opts, res);
    if (caseError) {
      return cb(caseError);
    }

    cb(null, res);
  });
};

exports.resolve = resolve;
exports.buildModMap = buildModMap;
