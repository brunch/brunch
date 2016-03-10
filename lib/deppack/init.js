'use strict';

const sysPath = require('path');
const each = require('async-each');
const helpers = require('./helpers');
const globalPseudofile = helpers.globalPseudofile;
const xBrowserResolve = require('./resolve');

const loadGlobalsAndStyles = npmConfig => new Promise((resolve, reject) => {
  const rootPath = sysPath.resolve(npmConfig.paths.root);

  const globals = npmConfig.npm.globals || {};
  const styles = npmConfig.npm.styles || {};

  const res = (i, cb) => xBrowserResolve.resolve(npmConfig, i, {filename: globalPseudofile}, cb);

  xBrowserResolve.buildModMap(npmConfig).then(() => {
    const globModules = Object.keys(globals).map(k => globals[k]);
    each(globModules, res, (err, fullPaths) => {
      if (err) return reject(err);

      npmConfig.depGraph.addFileMods(globalPseudofile, globModules);
      npmConfig.depGraph.addFileFiles(globalPseudofile, fullPaths.map(helpers.makeRelative));

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
        files: npmConfig.npm.static || []
      }];

      resolve({ components: styleComps.concat(globComps).concat(staticFiles) });
    });
  });
});

module.exports = loadGlobalsAndStyles;
