'use strict';
const debug = require('debug')('brunch:asset');
const sysPath = require('universal-path');
const readFromCache = require('fcache').readFile;
const processAsset = require('./pipeline').processAsset;
const BrunchError = require('../utils/error');
const isIgnored = require('./is_ignored');

// Get first parent directory that matches asset convention.
// getAssetDirectory('app/assets/thing/index.html') returns
// ['app/', 'app/assets/', 'app/assets/thing/']
const parentDirs = path => {
  return path.split('/').map((part, index, parts) => {
    return parts.slice(0, index).concat(part, '').join('/');
  }).slice(0, -1);
};

class Asset {
  constructor(path, publicPath, assetsConvention) {
    debug(`Init asset ${path}`);

    this.path = this._sourcePath = path;
    this.source = this.compiled = '';
    this.removed = this.disposed = false;

    this.error = null;
    this.dependencies = [];
    this.compilationTime = 0;

    Object.defineProperty(this, 'destinationPath', {
      get() {
        const assetsDir = parentDirs(this.path).find(assetsConvention);
        if (!assetsDir) {
          throw new BrunchError('MOVED_ASSET', {path});
        }

        const rel = sysPath.relative(assetsDir, this.path);

        return sysPath.join(publicPath, rel);
      },
      enumerable: true,
      configurable: true,
    });

    // Disallow adding new properties and changing descriptors.
    Object.seal(this);
  }

  get copyTime() {
    return this.compilationTime;
  }

  compile() {
    const path = this.path = this._sourcePath;
    if (isIgnored(path)) return Promise.resolve(this);
    if (this.disposed) {
      throw new BrunchError('ALREADY_DISPOSED', {path});
    }

    return readFromCache(path)
      .then(data => {
        this.source = data;
        return {path, data};
      })
      .then(processAsset)
      .then(file => this._updateCache(file))
      .catch(error => {
        this.error = error;
        return this;
      });
  }

  _updateCache(file) {
    this.path = sysPath.normalize(file.path);
    this.compiled = file.data;
    this.dependencies = file.dependencies || [];
    this.compilationTime = Date.now();
  }

  dispose() {
    debug(`Disposing asset ${this.path}`);

    this.path = this._sourcePath = '';
    this.source = this.compiled = '';
    this.disposed = true;
    this.error = null;
    this.dependencies = Object.freeze([]);

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = Asset;
