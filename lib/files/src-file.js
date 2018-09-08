'use strict';
const logger = require('loggy');
const BrunchError = require('../error');
const {processFile} = require('../pipeline');
const {
  readOnly,
  fs,
} = require('../utils');

module.exports = class SourceFile {
  constructor(path) {
    readOnly(this, {path});

    this._source = '';
    this._targets = {};
    this._disposed = false;
    this.dependencies = [];

    Object.seal(this);
  }

  get isAsset() {
    return false;
  }

  makeDirty() {
    this._source = '';
  }

  async compile() {
    const {path} = this;
    if (this._disposed) {
      throw new BrunchError('ALREADY_DISPOSED', {path});
    }

    const data = await (this._source || fs.readFile(path, 'utf-8'));
    const file = await processFile({path, data});

    return this._updateCache(file);
  }

  _updateCache(file) {
    this.dependencies = file.dependencies || [];

    const {data} = file;

    return this._updateMap(data, file.sourceMap).then(node => {
      this.targets = {
        // [this.type]: {data, node},
      };

      const {exports} = file;
      if (!exports) return;

      // redo
      this.targets.javascript = {
        data: exports,
        node: wrappedNode(this.path, exports),
      };
    });
  }

  delete() {
    this.dispose();
  }

  dispose() {
    if (this._disposed) return;

    this._source = '';
    this._targets = Object.freeze({});
    this._disposed = true;
    this.dependencies = Object.freeze([]);

    Object.freeze(this);
  }
};
