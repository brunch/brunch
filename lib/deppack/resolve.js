'use strict';

const browserResolve = require('browser-resolve');
const modules = require('./modules');
const globalPseudofile = require('./helpers').globalPseudofile;
const mediator = require('../mediator');

const resolveErrorRe = /Cannot find module '(.+)' from '(.+)'/;

module.exports = (mod, opts, cb) => {
  Object.assign(opts, {packageFilter: modules.applyPackageOverrides});
  browserResolve(mod, opts, (err, res) => {
    if (err) {
      if (resolveErrorRe.test(err.message)) {
        const data = err.message.match(resolveErrorRe);
        const mod = data[1];
        const src = data[2];
        const topLevel = modules.getModuleRootName(mod);
        const isGlob = opts.filename === globalPseudofile;
        err = isGlob ? `Could not load global module '${mod}'.` : `Could not load module '${mod}' from '${src}'.`;

        if (mediator.packages[topLevel] == null) {
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
