'use strict';

class UsedShims {
  constructor() {
    this.usedShims = [];
  }

  usesShim(shim) {
    return this.usedShims.indexOf(shim) !== -1;
  }

  usesProcess() {
    return this.usesShim('process');
  }

  addShims(shims) {
    this.usedShims = Array.from(new Set(this.usedShims.concat(shims)));
  }

  toArray() {
    return this.usedShims;
  }
}

module.exports = UsedShims;
