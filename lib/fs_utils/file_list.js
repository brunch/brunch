'use strict';
const debug = require('debug')('brunch:list');
const EventEmitter = require('events');
const formatError = require('../utils/helpers').formatError;
const FrozenMap = require('../utils/helpers').FrozenMap;
const FrozenSet = require('../utils/helpers').FrozenSet;
const Asset = require('./asset');
const SourceFile = require('./source_file');
const anymatch = require('anymatch');

// A list of `fs_utils.SourceFile` or `fs_utils.Asset` that contains *all* file
// from Brunches app with some additional methods used to simplify file reading / removing.
class FileList extends EventEmitter {
  constructor(config) {
    super();

    // Maximum time between changes of two files that
    // will be considered as a one compilation.
    this.resetTime = config.fileListInterval;
    this.npmStatic = config.npm.static;

    const norm = config._normalized;

    // Grab values from config.
    this.publicPath = norm.paths.public;
    this.conventions = norm.conventions;
    this.moduleWrapper = norm.modules.wrapper;

    this.files = new Map();
    this.assets = new Map();

    this.reading = new Map();
    this.compiling = new Set();
    this.compiled = new Set();

    this.timer = null;
    this.initial = true;
    this.disposed = false;

    this.on('change', this._change);
    this.on('unlink', this._unlink);

    // Disallow adding new properties and changing descriptors.
    Object.seal(this);
  }

  get assetErrors() {
    return Array.from(this.assets.values()).filter(file => file.error).map(formatError);
  }

  get hasFiles() {
    return !!(this.files.size || this.assets.size);
  }

  copiedAfter(time) {
    return Array.from(this.assets.values()).filter(asset => {
      return asset.compilationTime >= time;
    });
  }

    if (!this.initial) this._compileParents(path);
  }

  compile(file) {
    const path = file.path;
    file.removed = false;
    if (this.compiling.has(path)) {
      this._resetTimer();
      return;
    }

    this.compiling.add(path);
    file.compile().finally(() => {
      this.compiling.delete(path);
      this._resetTimer();
    }).then(() => {
      debug(`Compiled ${path}`);
      this.compiled.add(path);
    });
  }


  _addAsset(path) {
    const file = new Asset(path, this.publicPath, this.conventions.assets);
    this.assets.set(file.path, file);
    return file;
  }

  _addFile(path) {
    const file = new SourceFile(path, this.npmStatic, this.conventions.vendor, this.moduleWrapper, this);
    this.files.set(file.path, file);
    return file;
  }

  _change(path) {
    if (this.disposed) return;
    if (this.reading.has(path)) return;

    debug(`Reading ${path}`);
    const readDate = Date.now();
    this.reading.set(path, readDate);

    readAndCache(path).then(() => {
      const cachedDate = this.reading.get(path);
      if (this.disposed || !cachedDate || cachedDate > readDate) return;
      this.reading.delete(path);

      const isIgnored = this.conventions.ignored(path);
      if (!isIgnored) {
        const isAsset = this.conventions.assets(path);
        const file = isAsset ?
          this.assets.get(path) || this._addAsset(path) :
          this.files.get(path) || this._addFile(path);

        this.compile(file);
      }
  _compileParents(path) {
    const files = this.conventions.assets(path) ? this.assets : this.files;
    const isParent = file => !this.compiled.has(file.path) && anymatch(file.dependencies, path);

      this._resetTimer();
    }, error => {
      if (!this.disposed) {
        throw new BrunchError('READ_FAILED', {path, error});
      }
    });
    Array.from(files.values())
      .filter(isParent)
      .forEach(file => this._compile(file));
  }

  _unlink(path) {
    const isIgnored = this.conventions.ignored(path);
    if (isIgnored) {
      this._compileParents(path);
    } else {
      const files = this.conventions.assets(path) ? this.assets : this.files;
      const file = files.get(path);
      if (file) {
        file.delete();
        files.delete(path);
      }
    }
    this._resetTimer();
  }

  _resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.compiling.size) {
        this._resetTimer();
      } else {
        this.emit('ready');
        this.compiled.clear();
      }
    }, this.resetTime);
  }

  dispose() {
    this.files.forEach(file => file.dispose());
    this.files = new FrozenMap();
    this.assets.forEach(file => file.dispose());
    this.assets = new FrozenMap();

    this.reading = new FrozenMap();
    this.compiling = new FrozenSet();
    this.compiled = new FrozenSet();

    this.disposed = true;
    this.removeAllListeners();
    clearTimeout(this.timer);

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = FileList;
