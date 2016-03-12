'use strict';

const sysPath = require('path');
const promisify = require('micro-promisify');
const each = promisify(require('async-each'));
const makeRelative = require('./helpers').makeRelative;

const loadGlobalsAndStyles = (rootPath, depGraph, globalPseudofile, npm, browserResolve) => {
  rootPath = sysPath.resolve(rootPath);

  const globals = npm.globals || {};
  const styles = npm.styles || {};
  const statics = npm.static || [];

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
    files: statics
  }];

  const res = (i, cb) => browserResolve(i, {filename: globalPseudofile}, cb);
  const globModules = Object.keys(globals).map(k => globals[k]);
  return each(globModules, res).then(fullPaths => {
    depGraph.addFileMods(globalPseudofile, globModules);
    depGraph.addFileFiles(globalPseudofile, fullPaths.map(makeRelative));

    const globComps = [{
      component: globalPseudofile,
      files: fullPaths.map(makeRelative)
    }];

    return { components: styleComps.concat(globComps).concat(staticFiles) };
  });
};

module.exports = loadGlobalsAndStyles;
