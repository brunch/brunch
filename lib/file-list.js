'use strict';
const EventEmitter = require('events');
const anymatch = require('anymatch');
const Asset = require('./asset');
const SourceFile = require('./source_file');
const config = require('./config').norm;
const {FrozenMap, FrozenSet} = require('./helpers');

class FileList extends EventEmitter {
  constructor() {
    super();

    this._files = new Map();
    this.compiling = new Set();
    this.compiled = new Set();

    this.on('change', this._change);
    this.on('unlink', this._unlink);
    this._disposed = false;

    Object.seal(this);
  }

  _change(path) {
    if (config.conventions.ignored(path)) return;

    const file = this._files.get(path) || this._addFile(path);
    file.makeDirty();

    this._compile(file);
    this._compileParents(path);
  }

  _compile(file) {
    const {path} = file;
    if (this.compiling.has(path)) return;

    this.compiling.add(path);
    file.compile().then(() => {
      this.compiled.add(file);
    }).finally(() => {
      this.compiling.delete(file);
    });
  }

  _compileParents(path) {
    const isParent = file => {
      return !this.compiled.has(file.path) &&
        anymatch(file.dependencies, path);
    };

    this._files.forEach(file => {
      if (isParent(file)) this._compile(file);
    });
  }

  _addFile(path) {
    const file = config.conventions.assets(path) ?
      new Asset(path) :
      new SourceFile(path, this);

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
    const assets = files
      .filter(file => file.isAsset)
      .map(file => file.write());

    return Promise.all([assets, files]);
  }

  dispose() {
    this._files.forEach(file => file.dispose());
    this._files = new FrozenMap();

    this.compiling = new FrozenSet();
    this.compiled = new FrozenSet();

    this.removeAllListeners();
    this._disposed = true;

    Object.freeze(this);
  }
}

module.exports = FileList;
