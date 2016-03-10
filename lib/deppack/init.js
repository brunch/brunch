'use strict';

const sysPath = require('path');
const each = require('async-each');
const explore = require('./explore');
const helpers = require('./helpers');
const globalPseudofile = helpers.globalPseudofile;
const xBrowserResolve = require('./resolve');
const modules = require('./modules');
const shims = require('./shims');
const mediator = require('../mediator');

const loadInit = npmConfig => (config, json) => new Promise((resolve, reject) => {
  npmConfig.conventions = config.conventions;
  npmConfig.overrides = json.overrides || {};
  npmConfig.packages = json.dependencies || {};
  npmConfig.nameCleaner = config.modules.nameCleaner;
  npmConfig.paths = config.paths;
  npmConfig.npm = config.npm || {};
  npmConfig.npmIsEnabled = mediator.npmIsEnabled;
  npmConfig.isProduction = mediator.isProduction;

  npmConfig.rootMainCache = {};
  npmConfig.usedShims = [];

  npmConfig.fileModMap = {};
  npmConfig.fileFileMap = {};

  explore.resetCache();

  npmConfig.modMap = {};

  const rootPath = sysPath.resolve(npmConfig.paths.root);

  const globals = config.npm.globals || {};
  const styles = config.npm.styles || {};

  const res = (i, cb) => xBrowserResolve.resolve(npmConfig, i, {filename: globalPseudofile}, cb);

  xBrowserResolve.buildModMap(npmConfig).then(() => {
    const globModules = Object.keys(globals).map(k => globals[k]);
    each(globModules, res, (err, fullPaths) => {
      if (err) return reject(err);

      explore.addFileMods(npmConfig, globalPseudofile, globModules);
      explore.addFileFiles(npmConfig, globalPseudofile, fullPaths.map(helpers.makeRelative));

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
