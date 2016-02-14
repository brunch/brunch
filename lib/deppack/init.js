'use strict';

const sysPath = require('path');
const each = require('async-each');
const explore = require('./explore');
const helpers = require('./helpers');
const globalPseudofile = helpers.globalPseudofile;
const xBrowserResolve = require('./resolve');
const mediator = require('../mediator');

const loadInit = (config, json) => new Promise((resolve, reject) => {
  mediator.conventions = config.conventions;
  mediator.overrides = json.overrides || {};
  mediator.packages = json.dependencies || {};
  mediator.nameCleaner = config.modules.nameCleaner;
  mediator.paths = config.paths;
  mediator.npm = config.npm || {};

  const rootPath = sysPath.resolve(mediator.paths.root);

  const globals = config.npm.globals || {};
  const styles = config.npm.styles || {};

  const res = (i, cb) => xBrowserResolve.resolve(i, {filename: globalPseudofile}, cb);

  xBrowserResolve.buildModMap().then(() => {
    const globModules = Object.keys(globals).map(k => globals[k]);
    each(globModules, res, (err, fullPaths) => {
      if (err) return reject(err);

      explore.addFileMods(globalPseudofile, globModules);
      explore.addFileFiles(globalPseudofile, fullPaths.map(helpers.makeRelative));

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
        files: fullPaths.map(helpers.makeRelative)
      }];

      const staticFiles = [{
        component: 'npmStatic',
        files: config.npm.static || []
      }];

      resolve({ components: styleComps.concat(globComps).concat(staticFiles) });
    });
  });
});

module.exports = loadInit;
