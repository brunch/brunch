'use strict';
const sysPath = require('universal-path');
const copyFile = require('quickly-copy-file');
const BrunchError = require('../error');
const {unlink} = require('fs');
const {processAsset} = require('../pipeline');
const config = require('../config');

const {
  readOnly,
  parentDirs,
  writeFile,
  fs,
} = require('../utils');

module.exports = co(class Asset {
  constructor(path) {
    readOnly(this, {path});

    this._prevDestPath = '';
    this._rawSource = null;
    this._compiled = null;
    this._disposed = false;

    this.destinationPath = '';
    this.dependencies = [];

    Object.seal(this);
  }

  get isAsset() {
    return true;
  }

  get isCompiled() {
    return !!this._compiled;
  }

  makeDirty() {
    this._rawSource = null;
  }

  * compile__async__() {
    const {path} = this;
    if (this._disposed) {
      throw new BrunchError('ALREADY_DISPOSED', {path});
    }

    const file = yield processAsset(this);
    this._updateCache(file);
  }

  _read() {
    if (!this._rawSource) {
      this._rawSource = fs.readFile(this.path);
    }

    return this._rawSource;
  }

  * hydrate__async__() {
    const rawData = yield this._read();

    return {
      rawData,
      get data() {
        return `${rawData}`;
      },
      path: this.path,
    };
  }

  _updateCache(file) {
    const path = sysPath.normalize(file.path);
    const assetsDir = parentDirs(path).find(conventions.asset);
    if (!assetsDir) throw new BrunchError('MOVED_ASSET', {path});

    const rel = sysPath.relative(assetsDir, path);

    this._compiled = file.rawData || file.data;
    this.destinationPath = sysPath.join(config.paths.public, rel);
    this.dependencies = file.dependencies || []; // !
  }

  * write__async__() {
    const prevDest = this._prevDestPath;
    const dest = this.destinationPath;
    if (prevDest && prevDest !== dest) {
      unlink(prevDest);
    }

    const compiled = this._compiled;
    const written = compiled ?
      writeFile(dest, compiled) :
      copyFile(this.path, dest);

    try {
      if (this.isCompiled) {
        yield writeFile(dest, this._compiled)
      } else {
        yield copyFile(this.path, dest);
      }
    } finally {
      this._prevDestPath = dest;
    }
  }

  delete() {
    unlink(this.destinationPath);

    this.dispose();
  }

  dispose() {
    if (this._disposed) return;

    this._prevDestPath = '';
    this._rawSource = null;
    this._compiled = null;
    this._disposed = true;

    this.destinationPath = '';
    this.dependencies = Object.freeze([]);

    Object.freeze(this);
  }
});
