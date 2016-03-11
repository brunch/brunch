'use strict';

const sysPath = require('path');
const promisify = require('../helpers').promisify;
const each = promisify(require('async-each'));
const helpers = require('./helpers');
const globalPseudofile = helpers.globalPseudofile;
const xBrowserResolve = require('./resolve');

const loadGlobalsAndStyles = npmConfig => {
  const depGraph = npmConfig.depGraph;
  const rootPath = sysPath.resolve(npmConfig.paths.root);

  const globals = npmConfig.npm.globals || {};
  const styles = npmConfig.npm.styles || {};

  const styleComps = Object.keys(styles).map(pkg => {
    const stylesheets = styles[pkg];
    const root = sysPath.join(rootPath, 'node_modules', pkg);

    return {
      component: pkg,
      files: stylesheets.map(style => sysPath.join(root, style))
    };
  });

  const staticFiles = [{
    component: 'npmStatic',
    files: npmConfig.npm.static || []
  }];

  const res = (i, cb) => xBrowserResolve.resolve(npmConfig, i, {filename: globalPseudofile}, cb);
  const globModules = Object.keys(globals).map(k => globals[k]);
  return each(globModules, res).then(fullPaths => {
    depGraph.addFileMods(globalPseudofile, globModules);
    depGraph.addFileFiles(globalPseudofile, fullPaths.map(helpers.makeRelative));

    const globComps = [{
      component: globalPseudofile,
      files: fullPaths.map(helpers.makeRelative)
    }];

    return { components: styleComps.concat(globComps).concat(staticFiles) };
  });
};

module.exports = loadGlobalsAndStyles;
