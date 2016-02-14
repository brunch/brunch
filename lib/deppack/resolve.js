'use strict';

const browserResolve = require('browser-resolve');
const glob = require('glob');
const modules = require('./modules');
const globalPseudofile = require('./helpers').globalPseudofile;
const mediator = require('../mediator');
const promisify = require('../helpers').promisify;
const shims = require('./shims');

let modMap;

const addToModMap = mod => {
  const name = mediator.nameCleaner(mod.split('.').slice(0, -1).join('.'));
  modMap[name] = mod;
};

const noPackage = x => mediator.packages[x] === null;

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

const resolve = (mod, opts, cb) => {
  Object.assign(opts, {packageFilter: modules.applyPackageOverrides, modules: modMap, extensions: ['.js', '.json']});
  mod = mediator.npm.aliases && mediator.npm.aliases[mod] || mod;
  browserResolve(mod, opts, (err, res) => {
    if (err) {
      if (resolveErrorRe.test(err.message)) {
        const data = err.message.match(resolveErrorRe);
        const mod = data[1];
        const src = data[2];
        const topLevel = modules.getModuleRootName(mod);
        const isGlob = opts.filename === globalPseudofile;
        err = isGlob ? `Could not load global module '${mod}'.` : `Could not load module '${mod}' from '${src}'.`;

        if (noPackage(topLevel)) {
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
      return cb(err);
    }
    cb(null, res);
  });
};

exports.resolve = resolve;
exports.buildModMap = buildModMap;
exports.addToModMap = addToModMap;
