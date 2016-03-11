'use strict';

const sysPath = require('path');
const fs = require('fs');
const modules = require('./modules');
const helpers = require('./helpers');
const promisify = require('../helpers').promisify;
const mediator = require('../mediator');
const xBrowserResolve = require('./resolve');
const loadGlobalsAndStyles = require('./load-globs-styles');
const explore = require('./explore');
const processFiles = require('./process');
const DepGraph = require('./dep-graph');
const UsedShims = require('./used-shims');
const ProjectModuleMap = require('./project-module-map');

const dir = sysPath.dirname(sysPath.dirname(require.resolve('..')));
const readFile = promisify((path, callback) => fs.readFile(path, {encoding: 'utf8'}, callback));

let deppack;

class Deppack {
  constructor(config, json) {
    if (!json.overrides) json.overrides = {};
    if (!json.dependencies) json.dependencies = {};

    this.npmConfig = {
      rootPackage: json,
      conventions: config.conventions,
      paths: config.paths,
      npm: config.npm || {},
      isProduction: mediator.isProduction,

      rootMainCache: {},

      usedShims: new UsedShims(),
      depGraph: new DepGraph(),
      modMap: new ProjectModuleMap(config.modules.nameCleaner)
    };
  }

  init() {
    if (!this.npmConfig.npm.enabled) return Promise.resolve({ components: [] });

    return xBrowserResolve.buildModMap(this.npmConfig)
      .then(() => loadGlobalsAndStyles(this.npmConfig));
  }

  exploreDeps(sourceFile) {
    if (!this.npmConfig.npm.enabled) return Promise.resolve(sourceFile);
    return explore(this.npmConfig)(sourceFile);
  }

  processFiles(root, files, processor) {
    if (!this.npmConfig.npm.enabled) return;
    processFiles(this.npmConfig)(root, files, processor);
  }

  wrapInModule(filePath) {
    filePath = sysPath.resolve('.', filePath);
    return readFile(filePath).then(src => modules.wrap(this.npmConfig, filePath, src));
  }

  needsProcessing(file) {
    if (!this.npmConfig.npm.enabled) return false;
    return file.path.indexOf('node_modules') !== -1 &&
      (file.path.indexOf('.js') !== -1 || file.path.indexOf('.json') !== -1) &&
      !brunchRe.test(file.path) &&
      helpers.isPackage(this.npmConfig)(file.path) ||
      this.isNpm(file.path);
  }

  isNpm(path) {
    if (!this.npmConfig.npm.enabled) return false;
    return path.indexOf('node_modules') >= 0 &&
      !brunchRe.test(path) && path.indexOf('.css') === -1 &&
      helpers.isPackage(path) ||
      path.indexOf(dir) === 0;
  }

  isNpmJSON(path) {
    return this.isNpm(path) && path.indexOf('.json') !== -1;
  }
}


const brunchRe = /brunch/;

exports.loadInit = (config, json) => {
  deppack = new Deppack(config, json);
  exports.exploreDeps = deppack.exploreDeps.bind(deppack);
  exports.processFiles = deppack.processFiles.bind(deppack);
  exports.wrapInModule = deppack.wrapInModule.bind(deppack);
  exports.needsProcessing = deppack.needsProcessing.bind(deppack);
  exports.isNpm = deppack.isNpm.bind(deppack);
  exports.isNpmJSON = deppack.isNpmJSON.bind(deppack);
  return deppack.init();
};


exports.isShim = path => path.indexOf(dir) === 0;
