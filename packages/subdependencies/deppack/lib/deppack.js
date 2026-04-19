'use strict';

const sysPath = require('./path');
const fs = require('fs');
const anymatch = require('anymatch');
const {promisify} = require('util');
const modules = require('./modules');
const xBrowserResolve = require('./resolve');
const loadGlobalsAndStyles = require('./load-globs-styles');
const explore = require('./explore');
const processFiles = require('./process');
const packages = require('./packages');
const DepGraph = require('./dep-graph');
const UsedShims = require('./used-shims');
const ProjectModuleMap = require('./project-module-map');

const readFile = promisify((path, callback) => fs.readFile(path, {encoding: 'utf8'}, callback));
const dir = sysPath.dirname(sysPath.dirname(require.resolve('..')));

const brunchRe = /\-brunch|brunch\-/;
const packageRe = /node_modules/;
const isNodeModule = path => packageRe.test(path);
const isNotBrunchPlugin = path => !brunchRe.test(path);
const isShim = path => path.indexOf(dir) === 0;

const jsonRe = /\.json$/;
const isJson = path => jsonRe.test(path);
const jsJsonRe = /\.(json|js)$/;
const isJsOrJson = path => jsJsonRe.test(path);
const cssRe = /\.css$/;
const isNotCss = path => !cssRe.test(path);

const fileReflection = (statics, conventions) => {
  const isPackage = path => isNodeModule(path) && (statics || []).indexOf(path) === -1;
  const isVendor = path => isPackage(path) ? false : anymatch(conventions.vendor, path);
  const isApp = path => !anymatch(conventions.vendor, path);

  return {isPackage, isVendor, isApp};
};

class Deppack {
  constructor(config, json) {
    if (!json.overrides) json.overrides = {};
    if (!json.dependencies) json.dependencies = {};

    this.rootPackage = json;
    this.conventions = config.conventions;
    this.paths = config.paths;
    this.npm = config.npm || {};
    this.isProduction = config._normalized.isProduction;

    this.globalPseudofile = '___globals___';

    this.plugins = [];
    this.npmPlugins = [];
    this.allMatchers = [];
    this.rootMainCache = {};
    this.usedShims = new UsedShims();
    this.depGraph = new DepGraph();
    this.modMap = new ProjectModuleMap(config.modules.nameCleaner);

    this.fileReflection = fileReflection(this.npm.static, this.conventions);
    this.resolve = xBrowserResolve.resolve(this.rootPackage, this.modMap, this.npm.aliases, this.globalPseudofile);

    this.getPackageJson = filePath => {
      return packages.packageJson(filePath, this.rootPackage);
    };

    this.canCallDep = path => packages.canCallDep(this.getPackageJson, path);
  }

  init() {
    return xBrowserResolve.buildModMap(this.modMap, this.paths.watched, this.rootPackage)
      .then(() => loadGlobalsAndStyles(this.paths.root, this.depGraph, this.globalPseudofile, this.npm, this.resolve));
  }

  setPlugins(plugins, npmPlugins) {
    this.plugins = plugins;
    this.npmPlugins = npmPlugins;
    const plugs = plugins.compilers.filter(x => x.type === 'javascript' && npmPlugins.indexOf(x.brunchPluginName) !== -1);
    const extensions = plugs.map(x => x.extension).filter(x => x);
    const patterns = plugs.map(x => x.pattern).filter(x => x);
    const extMatchers = extensions.map(x => new RegExp(`\\.${x}$`));
    const allMatchers = patterns.concat(extMatchers);
    this.allMatchers = allMatchers;
  }

  exploreDeps(sourceFile) {
    return explore(this.depGraph, this.modMap, this.usedShims, this.canCallDep, this.isProduction, this.fileReflection, this.resolve, this.npm)(sourceFile);
  }

  processFiles(root, files, processor) {
    const filePaths = files.map(f => f.path);
    const requiredAliases = modules.requiredAliases(this.rootMainCache, this.getPackageJson, this.usedShims, filePaths);
    processFiles(this.npm.aliases || {}, this.npm.globals || {}, this.usedShims, requiredAliases)(root, files, processor);
  }

  wrapInModule(filePath) {
    filePath = sysPath.resolve('.', filePath);
    return readFile(filePath).then(src => this.wrapSourceInModule(src, filePath));
  }

  wrapSourceInModule(src, filePath) {
    return modules.wrap(this.getPackageJson, this.rootMainCache, filePath, src);
  }

  needsProcessing(file) {
    return isNodeModule(file.path) &&
      (isJsOrJson(file.path) || this.allMatchers.some(reg => reg.test(file.path))) &&
      isNotBrunchPlugin(file.path) &&
      this.fileReflection.isPackage(file.path) ||
      this.isNpm(file.path);
  }

  isNpm(path) {
    return isNodeModule(path) &&
      isNotBrunchPlugin(path) &&
      isNotCss(path) &&
      this.fileReflection.isPackage(path) ||
      isShim(path);
  }

  isNpmJSON(path) {
    return this.isNpm(path) && isJson(path);
  }

  isShim(path) {
    return isShim(path);
  }

  getAllDependents(path) {
    const fileDeps = [path].concat(this.depGraph.recursiveDependents(path));
    const globDeps = this.depGraph.recursiveDependents(this.globalPseudofile);

    return fileDeps.concat(globDeps);
  }

  graph() {
    return this.depGraph.serialize(this.modMap, this.fileReflection);
  }
}

module.exports = Deppack;
