'use strict';

const sysPath = require('path');
const fs = require('fs');
const modules = require('./modules');
const explore = require('./explore');
const helpers = require('./helpers');
const promisify = require('../helpers').promisify;
const mediator = require('../mediator');

const dir = sysPath.dirname(sysPath.dirname(require.resolve('..')));
const readFile = promisify((path, callback) => fs.readFile(path, {encoding: 'utf8'}, callback));

let deppack;

class Deppack {
  constructor(config, json) {
    this.npmConfig = {
      conventions: config.conventions,
      overrides: json.overrides || {},
      packages: json.dependencies || {},
      nameCleaner: config.modules.nameCleaner,
      paths: config.paths,
      npm: config.npm || {},
      npmIsEnabled: mediator.npmIsEnabled,
      isProduction: mediator.isProduction,

      rootMainCache: {},
      usedShims: [],

      fileModMap: {},
      fileFileMap: {},

      modMap: {}
    };

    this.init = () => require('./init')(this.npmConfig);
    this.exploreDeps = explore(this.npmConfig);
    this.processFiles = require('./process')(this.npmConfig);
  }

  wrapInModule(filePath, opts) {
    if (opts == null) opts = {};
    if (opts.paths == null) {
      const ref = process.env.NODE_PATH;
      opts.paths = (ref != null ? ref.split(':') : void 0) || [];
    }
    if (opts.basedir == null) opts.basedir = process.cwd();

    filePath = sysPath.resolve(opts.basedir, filePath);

    return readFile(filePath).then(src => modules.wrap(this.npmConfig, filePath, src));
  }

  needsProcessing(file) {
    return file.path.indexOf('node_modules') !== -1 &&
      (file.path.indexOf('.js') !== -1 || file.path.indexOf('.json') !== -1) &&
      !brunchRe.test(file.path) &&
      helpers.isPackage(this.npmConfig)(file.path) ||
      this.isNpm(file.path);
  }

  isNpm(path) {
    if (!this.npmConfig.npmIsEnabled) return false;
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
  exports.wrapInModule = deppack.wrapInModule.bind(deppack);
  exports.processFiles = deppack.processFiles.bind(deppack);
  exports.needsProcessing = deppack.needsProcessing.bind(deppack);
  exports.isNpm = deppack.isNpm.bind(deppack);
  exports.isNpmJSON = deppack.isNpmJSON.bind(deppack);
  return deppack.init();
}


exports.isShim = path => path.indexOf(dir) === 0;
