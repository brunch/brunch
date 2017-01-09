'use strict';
const debug = require('debug')('brunch:asset');
const deleteFile = require('fs').unlink;
const sysPath = require('universal-path');
const BrunchError = require('../utils/error');
const copyFile = require('quickly-copy-file');
const processAsset = require('./pipeline').processAsset;
const parentDirs = require('../utils/helpers').parentDirs;
const readonly = require('../utils/helpers').readonly;
const readFile = require('../utils/helpers').readFile;
const writeFile = require('../utils/helpers').writeFile;

class Asset {
  constructor(path, publicPath, assetsConvention) {
    debug(`Init asset ${path}`);
    readonly(this, {path});

    this._publicPath = publicPath;
    this._assetsConvention = assetsConvention;

    this._prevDestPath = '';
    this._rawSource = null;
    this._compiled = null;
    this._disposed = false;

    this.destinationPath = '';
    this.dependencies = [];
    this.error = null;
    this.compilationTime = 0;

    // Disallow adding new properties and changing descriptors.
    Object.seal(this);
  }

  makeDirty() {
    this._rawSource = null;
  }

  compile() {
    const path = this.path;
    if (this._disposed) throw new BrunchError('ALREADY_DISPOSED', {path});

    return processAsset(this)
      .then(file => this._updateCache(file))
      .catch(error => {
        this.error = error;
        return this;
      });
  }

  _read() {
    if (!this._rawSource) {
      this._rawSource = readFile(this.path);
    }

    return this._rawSource;
  }

  hydrate() {
    return this._read().then(rawData => {
      return {
        rawData,
        get data() {
          return `${rawData}`;
        },
        path: this.path,
      };
    });
  }

  _updateCache(file) {
    const path = sysPath.normalize(file.path);
    const assetsDir = parentDirs(path).find(this._assetsConvention);
    if (!assetsDir) throw new BrunchError('MOVED_ASSET', {path});

    const rel = sysPath.relative(assetsDir, path);

    this._compiled = file.rawData || file.data;
    this.destinationPath = sysPath.join(this._publicPath, rel);
    this.dependencies = file.dependencies || [];
    this.compilationTime = Date.now();
  }

  write() {
    const prevDest = this._prevDestPath;
    const dest = this.destinationPath;
    if (prevDest && prevDest !== dest) {
      deleteFile(prevDest);
    }

    const compiled = this._compiled;
    const written = compiled ?
      writeFile(dest, compiled) :
      copyFile(this.path, dest);

    return written.finally(() => {
      this._prevDestPath = dest;
    });
  }

  delete() {
    debug(`Removing asset ${this.path}`);
    deleteFile(this.destinationPath);

    this.dispose();
  }

  dispose() {
    if (this._disposed) return;

    debug(`Disposing asset ${this.path}`);

    this._prevDestPath = '';
    this._rawSource = null;
    this._compiled = null;
    this._disposed = true;

    this.destinationPath = '';
    this.dependencies = Object.freeze([]);
    this.error = null;
    this.compilationTime = 0;

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = Asset;
