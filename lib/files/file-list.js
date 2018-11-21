'use strict';
const EventEmitter = require('events');
const anymatch = require('anymatch');
const Asset = require('./asset');
const SourceFile = require('./src-file');
const
const {
  deepFreeze,
} = require('../utils');

module.exports = class FileList extends EventEmitter {
  constructor(config) {
    super();

    this._disposed = false;
    this._files = new Map();
    this._config = config;

    this._compiling = new Set();
    this._compiled = new Set();

    this.on('change', this._change);
    this.on('unlink', this._unlink);

    Object.seal(this);
  }

  _change(path) {
    if (config.conventions.ignored(path)) return;

    const file = this._files.get(path) || this._addFile(path);
    file.makeDirty();

    this._compile(file);
    this._compileParents(path);
  }

  async _compile(file) {
    const {path} = file;
    if (this._compiling.has(path)) return;

    this._compiling.add(path);
    try {
      await file.compile();
      this._compiled.add(file);
    } finally {
      this._compiling.delete(file);
    }
  }

  _compileParents(path) {
    const isParent = file => {
      return !this._compiled.has(file.path)
        && anymatch(file.dependencies, path);
    };

    this._files.forEach(file => {
      if (isParent(file)) this._compile(file);
    });
  }

  addFile(path) {
    const file = config.conventions.assets(path) ?
      new Asset(path) :
      new SourceFile(path);

    this._files.set(path, file);
    return file;
  }

  _unlink(path) {
    if (config.conventions.ignored(path)) {
      this._compileParents(path);
    } else {
      const file = this._files.get(path);
      if (file) {
        file.delete();
        this._files.delete(path);
      }
    }
  }

  write() {
    const files = [...this._files.values()];
    const assets = files // what??
      .filter(file => file.isAsset)
      .map(file => file.write());

    return Promise.all([assets, files]);
  }

  dispose() {
    this._files.forEach(file => {
      file.dispose();
    });

    deepFreeze(this);
    this._disposed = true;
  }
};
