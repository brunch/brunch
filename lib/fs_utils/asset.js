'use strict';
const debug = require('debug')('brunch:asset');
const sysPath = require('universal-path');
const readFromCache = require('fcache').readFile;
const {processFile} = require('./pipeline');
const BrunchError = require('../utils/error');
const isIgnored = require('./is_ignored');

const EMPTY_BUF = Buffer.alloc(0);
const EMPTY_ARR = Object.freeze([]);

// Returns all parent directories:
// < parentDirs('app/assets/thing/index.html')
// > ['app/', 'app/assets/', 'app/assets/thing/']
const parentDirs = path => {
  return path.split('/').map((part, index, parts) => {
    return parts.slice(0, index).concat(part, '').join('/');
  });
};

class Asset {
  constructor(path, publicPath, assetsConvention) {
    debug(`Init asset ${path}`);

    this.destinationPath = this.path = path;
    this.compiled = '';
    this.removed = false;
    this.disposed = false;

    this._publicPath = publicPath;
    this._assetsConvention = assetsConvention;
    this._wasProcessed = false;
    this._rawSource = EMPTY_BUF;

    this.error = undefined;
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

  async compile() {
    const path = this.path;
    if (this.disposed) {
      throw new BrunchError('ALREADY_DISPOSED', {path});
    }

    if (isIgnored(path)) return this;

    const data = await readFromCache(path);
    const asset = this;
    asset._wasProcessed = false;
    asset._rawSource = data;

    try {
      const file = await processFile({
        path,
        get data() {
          asset._wasProcessed = true;
          return `${data}`;
        }
      }, true);
      this._updateCache(file);
    } catch (error) {
      this.error = error;
    }
  }

  _updateCache(file) {
    const path = sysPath.normalize(file.path);
    const dirs = parentDirs(path);
    const aIndex = dirs.findIndex(this._assetsConvention);
    const assetsDir = aIndex != null && dirs[aIndex - 1];
    if (!assetsDir) {
      throw new BrunchError('MOVED_ASSET', {path});
    }

    const rel = sysPath.relative(assetsDir, path);

    this.error = undefined;
    this.destinationPath = sysPath.join(this._publicPath, rel);
    this.compiled = this._wasProcessed ? file.data : this._rawSource;
    this.dependencies = file.dependencies || [];
    this.compilationTime = Date.now();
  }

  dispose() {
    debug(`Disposing asset ${this.path}`);

    this.path = '';
    this._rawSource = EMPTY_BUF;
    this.compiled = '';
    this.disposed = true;
    this.error = undefined;
    this.dependencies = EMPTY_ARR;

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = Asset;
