'use strict';

class NoDeppack {
  init() {
    return Promise.resolve({components: []});
  }

  setPlugins() {
  }

  exploreDeps(sourceFile) {
    return Promise.resolve(sourceFile);
  }

  processFiles() {}

  wrapInModule() {
    return Promise.resolve();
  }

  wrapSourceInModule() {
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

  isShim() {
    return false;
  }

  getAllDependents() {
    return [];
  }

  graph() {
    return {};
  }
}

module.exports = NoDeppack;
