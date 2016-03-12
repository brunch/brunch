'use strict';

class NoDeppack {
  init() {
    return Promise.resolve({components: []});
  }

  exploreDeps(sourceFile) {
    return Promise.resolve(sourceFile);
  }

  processFiles() {}

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

  isShim() {
    return false;
  }
}

module.exports = NoDeppack;
