'use strict';
const debug = require('debug')('brunch:asset');
const sysPath = require('universal-path');
const copyFile = require('quickly-copy-file');
const BrunchError = require('./error');

const {raw: config, conventions} = require('./config');
const {processAsset} = require('./pipeline');
const {
  readonly,
  parentDirs,
  writeFile,
  fs,
} = require('./helpers');

module.exports = class Asset {
  constructor(path) {
    debug(`Init asset ${path}`);
    readonly(this, {path});

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

  makeDirty() {
    this._rawSource = null;
  }

  compile() {
    const {path} = this;
    if (this._disposed) throw new BrunchError('ALREADY_DISPOSED', {path});

    return processAsset(this).then(file => this._updateCache(file));
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
    const assetsDir = parentDirs(path).find(conventions.asset);
    if (!assetsDir) throw new BrunchError('MOVED_ASSET', {path});

    const rel = sysPath.relative(assetsDir, path);

    this._compiled = file.rawData || file.data;
    this.destinationPath = sysPath.join(config.paths.public, rel);
    this.dependencies = file.dependencies || []; // !
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

    Object.freeze(this);
  }
};
