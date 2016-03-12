'use strict';
const Deppack = require('./deppack');
const NoDeppack = require('./no-deppack');

let deppack;
exports.loadInit = (config, json) => {
  deppack = config.npm.enabled ? new Deppack(config, json) : new NoDeppack();
  exports.exploreDeps = deppack.exploreDeps.bind(deppack);
  exports.processFiles = deppack.processFiles.bind(deppack);
  exports.wrapInModule = deppack.wrapInModule.bind(deppack);
  exports.needsProcessing = deppack.needsProcessing.bind(deppack);
  exports.isNpm = deppack.isNpm.bind(deppack);
  exports.isNpmJSON = deppack.isNpmJSON.bind(deppack);
  exports.isShim = deppack.isShim.bind(deppack);
  return deppack.init();
};
