'use strict';
const debug = require('debug')('brunch:list');
const EventEmitter = require('events');
const readAndCache = require('fcache').updateCache;
const formatError = require('../utils/helpers').formatError;
const FrozenMap = require('../utils/helpers').FrozenMap;
const FrozenSet = require('../utils/helpers').FrozenSet;
const Asset = require('./asset');
const SourceFile = require('./source_file');
const BrunchError = require('../utils/error');
const anymatch = require('anymatch');

// A list of `fs_utils.SourceFile` or `fs_utils.Asset` that contains *all* file
// from Brunches app with some additional methods used to simplify file reading / removing.
class FileList extends EventEmitter {
  constructor(config) {
    super();

    // Maximum time between changes of two files that
    // will be considered as a one compilation.
    this.resetTime = config.fileListInterval;

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

  get hasPendingFiles() {
    return !!(this.reading.size || this.compiling.size);
  }

  copiedAfter(time) {
    return Array.from(this.assets.values()).filter(asset => {
      return asset.copyTime > time;
    });
  }

  removeDisposedFiles() {
    this.files.forEach((file, path) => file.disposed && this.files.delete(path));
    this.assets.forEach((file, path) => file.disposed && this.assets.delete(path));
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

  compileDependencyParents(path) {
    const isAsset = this.conventions.assets(path);
    const files = isAsset ? this.assets : this.files;
    const paths = [];
    const parents = [];

    files.forEach((depFile, depPath) => {
      const deps = depFile.dependencies;
      const isDep = anymatch(deps, path) && !this.compiled.has(depPath);
      if (!isDep) return;
      paths.push(depPath);
      parents.push(depFile);
    });

    if (!parents.length) return;
    debug(`Compiling ${isAsset ? 'asset' : 'dependency'} ${path} parent(s): ${paths.join(', ')}`);
    parents.forEach(file => this.compile(file));
  }

  _addAsset(path) {
    const file = new Asset(path, this.publicPath, this.conventions.assets);
    this.assets.set(file.path, file);
    return file;
  }

  _addFile(path) {
    const file = new SourceFile(path, this.conventions.vendor, this.moduleWrapper, this);
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

      if (!this.initial) this.compileDependencyParents(path);
      this._resetTimer();
    }, error => {
      if (!this.disposed) {
        throw new BrunchError('READ_FAILED', {path, error});
      }
    });
  }

  _unlink(path) {
    const isIgnored = this.conventions.ignored(path);
    if (isIgnored) {
      this.compileDependencyParents(path);
    } else {
      const isAsset = this.conventions.assets(path);
      const file = isAsset ? this.assets.get(path) : this.files.get(path);
      if (file && !file.disposed) file.removed = true;
    }
    this._resetTimer();
  }

  _resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.removeDisposedFiles();
      if (this.hasPendingFiles) {
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
