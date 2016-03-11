'use strict';

const sysPath = require('path');
const fs = require('fs');
const anymatch = require('anymatch');
const modules = require('./modules');
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

const brunchRe = /brunch/;

const packageRe = /node_modules/;
const fileReflection = npmConfig => {
  const isPackage = path => packageRe.test(path) && (npmConfig.npm.static || []).indexOf(path) === -1;
  const isVendor = path => isPackage(path) ? false : anymatch(npmConfig.conventions.vendor, path);
  const isApp = path => !anymatch(npmConfig.conventions.vendor, path);

  return {isPackage, isVendor, isApp};
};

let deppack;

class Deppack {
  constructor(config, json) {
    if (!json.overrides) json.overrides = {};
    if (!json.dependencies) json.dependencies = {};

    const npmConfig = this.npmConfig = {
      rootPackage: json,
      conventions: config.conventions,
      paths: config.paths,
      npm: config.npm || {},
      isProduction: mediator.isProduction,

      globalPseudofile: '___globals___',

      rootMainCache: {},

      usedShims: new UsedShims(),
      depGraph: new DepGraph(),
      modMap: new ProjectModuleMap(config.modules.nameCleaner)
    };

    this.fileReflection = fileReflection(npmConfig);
    this.resolve = xBrowserResolve.resolve(npmConfig.rootPackage, npmConfig.modMap, npmConfig.npm.aliases, npmConfig.globalPseudofile);
  }

  init() {
    const npmConfig = this.npmConfig;
    return xBrowserResolve.buildModMap(npmConfig.modMap, npmConfig.paths.watched, npmConfig.rootPackage)
      .then(() => loadGlobalsAndStyles(npmConfig.paths.root, npmConfig.depGraph, npmConfig.globalPseudofile, npmConfig.npm, this.resolve));
  }

  exploreDeps(sourceFile) {
    const npmConfig = this.npmConfig;
    return explore(npmConfig.depGraph, npmConfig.modMap, npmConfig.usedShims, npmConfig.rootPackage, npmConfig.isProduction, this.fileReflection, this.resolve)(sourceFile);
  }

  processFiles(root, files, processor) {
    const npmConfig = this.npmConfig;
    processFiles(npmConfig.npm.aliases || {}, npmConfig.globals || {}, npmConfig.usedShims, modules.requiredAliases(npmConfig))(root, files, processor);
  }

  wrapInModule(filePath) {
    filePath = sysPath.resolve('.', filePath);
    return readFile(filePath).then(src => modules.wrap(this.npmConfig, filePath, src));
  }

  needsProcessing(file) {
    return file.path.indexOf('node_modules') !== -1 &&
      (file.path.indexOf('.js') !== -1 || file.path.indexOf('.json') !== -1) &&
      !brunchRe.test(file.path) &&
      this.fileReflection.isPackage(file.path) ||
      this.isNpm(file.path);
  }

  isNpm(path) {
    return path.indexOf('node_modules') >= 0 &&
      !brunchRe.test(path) && path.indexOf('.css') === -1 &&
      this.fileReflection.isPackage(path) ||
      path.indexOf(dir) === 0;
  }

  isNpmJSON(path) {
    return this.isNpm(path) && path.indexOf('.json') !== -1;
  }
}

class NoDeppack {
  init() {
    return Promise.resolve({ components: [] });
  }

  exploreDeps(sourceFile) {
    return Promise.resolve(sourceFile);
  }

  processFiles() {
    return;
  }

  wrapInModule() {
    return Promise.resolve();
  }

  needsProcessing() {
    return false;
  }

  isNpm() {
    return false;
  }

  isNpmJSON() {
    return false;
  }
}


exports.loadInit = (config, json) => {
  deppack = config.npm.enabled ? new Deppack(config, json) : new NoDeppack();
  exports.exploreDeps = deppack.exploreDeps.bind(deppack);
  exports.processFiles = deppack.processFiles.bind(deppack);
  exports.wrapInModule = deppack.wrapInModule.bind(deppack);
  exports.needsProcessing = deppack.needsProcessing.bind(deppack);
  exports.isNpm = deppack.isNpm.bind(deppack);
  exports.isNpmJSON = deppack.isNpmJSON.bind(deppack);
  return deppack.init();
};

exports.isShim = path => path.indexOf(dir) === 0;
