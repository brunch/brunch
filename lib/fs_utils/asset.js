'use strict';
const debug = require('debug')('brunch:asset');
const sysPath = require('universal-path');
const readFromCache = require('fcache').readFile;
const processAsset = require('./pipeline').processAsset;
const BrunchError = require('../utils/error');
const isIgnored = require('./is_ignored');

// Returns all parent directories:
// < parentDirs('app/assets/thing/index.html')
// > ['app/', 'app/assets/', 'app/assets/thing/']
const parentDirs = path => {
  return path.split('/').map((part, index, parts) => {
    return parts.slice(0, index).concat(part, '').join('/');
  }).slice(0, -1);
};

class Asset {
  constructor(path, publicPath, assetsConvention) {
    debug(`Init asset ${path}`);

    this.destinationPath = this.path = path;
    this.compiled = '';
    this.removed = this.disposed = false;

    this._publicPath = publicPath;
    this._assetsConvention = assetsConvention;
    this._wasProcessed = false;
    this._rawSource = new Buffer(0);

    this.error = null;
    this.dependencies = [];
    this.compilationTime = 0;

    // Disallow adding new properties and changing descriptors.
    Object.seal(this);
  }

  get source() {
    return `${this._rawSource}`;
  }

  get copyTime() {
    return this.compilationTime;
  }

  compile() {
    const path = this.path;
    if (this.disposed) {
      throw new BrunchError('ALREADY_DISPOSED', {path});
    }

    if (isIgnored(path)) return Promise.resolve(this);

    return readFromCache(path)
      .then(data => {
        const asset = this;
        asset._wasProcessed = false;
        asset._rawSource = data;

        return {
          path,
          get data() {
            asset._wasProcessed = true;
            return `${data}`;
          },
        };
      })
      .then(processAsset)
      .then(file => this._updateCache(file))
      .catch(error => {
        this.error = error;
        return this;
      });
  }

  _updateCache(file) {
    const path = sysPath.normalize(file.path);
    const assetsDir = parentDirs(path).find(this._assetsConvention);
    if (!assetsDir) {
      throw new BrunchError('MOVED_ASSET', {path});
    }

    const rel = sysPath.relative(assetsDir, path);

    this.error = null;
    this.destinationPath = sysPath.join(this._publicPath, rel);
    this.compiled = this._wasProcessed ? file.data : this._rawSource;
    this.dependencies = file.dependencies || [];
    this.compilationTime = Date.now();
  }

  dispose() {
    debug(`Disposing asset ${this.path}`);

    this.path = '';
    this._rawSource = new Buffer(0);
    this.compiled = '';
    this.disposed = true;
    this.error = null;
    this.dependencies = Object.freeze([]);

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = Asset;
