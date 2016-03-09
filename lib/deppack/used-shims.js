'use strict';
const uniq = require('./helpers').uniq;

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
    this.usedShims = uniq(this.usedShims.concat(shims));
  }

  toArray() {
    return this.usedShims;
  }
}

module.exports = UsedShims;
