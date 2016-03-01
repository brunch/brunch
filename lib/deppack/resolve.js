'use strict';

const sysPath = require('path');
const browserResolve = require('browser-resolve');
const glob = require('glob');
const modules = require('./modules');
const helpers = require('./helpers');
const mediator = require('../mediator');
const promisify = require('../helpers').promisify;
const shims = require('./shims');
const trueCasePath = require('true-case-path');

let modMap;

const addToModMap = mod => {
  const name = mediator.nameCleaner(mod.split('.').slice(0, -1).join('.'));
  modMap[name] = mod;
};

const noPackage = x => mediator.packages[x] == null;

const buildModMap = () => {
  // this is needed to not throw on app-wise requires
  // note that fileList.files can't be used because it's not fully populated until the first compilation
  const topPaths = mediator.paths.watched.join(',');
  return promisify(glob)(`{${topPaths}}/**/*`).then(mods => {
    const modMap0 = mods.reduce((map, mod) => {
      const name = mediator.nameCleaner(mod.split('.').slice(0, -1).join('.'));
      map[name] = mod;
      return map;
    }, {});

    const shimModMap = shims.emptyShims.filter(noPackage).reduce((acc, shim) => {
      acc[shim] = shims.makeSpecialShimFname(shim);
      return acc;
    }, {});

    const shimFileMap = Object.keys(shims.fileShims).filter(noPackage).reduce((acc, shim) => {
      acc[shim] = shims.fileShims[shim];
      return acc;
    }, {});

    modMap = Object.assign({}, modMap0, shimModMap, shimFileMap);
  });
};

const resolveErrorRe = /Cannot find module '(.+)' from '(.+)'/;
const friendlyRequireError = (mod, opts, err) => {
  const topLevel = modules.getModuleRootName(mod);
  if (resolveErrorRe.test(err.message)) {
    const data = err.message.match(resolveErrorRe);
    const mod = data[1];
    const src = data[2];
    const isGlob = opts.filename === helpers.globalPseudofile;
    err = isGlob ? `Could not load global module '${mod}'.` : `Could not load module '${mod}' from '${src}'.`;

    if (topLevel === '.' || topLevel === '..') {
      err += ' Make sure the file actually exists.';
    } else if (noPackage(topLevel)) {
      err += ` Possible solution: add '${topLevel}' to package.json and \`npm install\`.`;
    } else {
      if (mediator.overrides[mod]) {
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

const resolve = (mod, opts, cb) => {
  Object.assign(opts, {packageFilter: modules.applyPackageOverrides, modules: modMap, extensions: ['.js', '.json']});
  mod = mediator.npm.aliases && mediator.npm.aliases[mod] || mod;
  browserResolve(mod, opts, (err, res) => {
    if (err) {
      return cb(friendlyRequireError(mod, opts, err));
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
exports.addToModMap = addToModMap;
