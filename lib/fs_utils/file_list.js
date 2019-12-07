'use strict';
const debug = require('debug')('brunch:list');
const EventEmitter = require('events');
const readAndCache = require('fcache').updateCache;
const {formatError, frozenMap, frozenSet} = require('../utils/helpers');
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

    this.timer = undefined;
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

  getAssetsCopiedAfter(time) {
    return Array.from(this.assets.values()).filter(asset => asset.copyTime > time);
  }

  cleanDisposedFiles() {
    this.files.forEach((file, path) => file.disposed && this.files.delete(path));
    this.assets.forEach((file, path) => file.disposed && this.assets.delete(path));
  }

  async _compile(file) {
    const path = file.path;
    file.removed = false;
    if (this.compiling.has(path)) {
      this._resetTimer();
      return;
    }

    this.compiling.add(path);
    try {
      await file.compile();
    } finally {
      this.compiling.delete(path);
      this._resetTimer();
    }
    debug(`Compiled ${path}`);
    this.compiled.add(path);
  }

  _compileDependencyParents(path) {
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
    parents.forEach(file => this._compile(file));
  }

  _get(path, addOnMiss = true) {
    const isAsset = this.conventions.assets(path);
    const files = isAsset ? this.assets : this.files;
    let file = files.get(path);
    if (file) return file;
    if (!addOnMiss) return;

    file = isAsset ?
      new Asset(path, this.publicPath, this.conventions.assets) :
      new SourceFile(path, this.conventions.vendor, this.moduleWrapper, this);
    files.set(file.path, file);
    return file;
  }

  async _change(path) {
    if (this.disposed || this.reading.has(path)) return;

    debug(`Reading ${path}`);
    const readDate = Date.now();
    this.reading.set(path, readDate);
    try {
      await readAndCache(path);
      const cachedDate = this.reading.get(path);
      if (this.disposed || !cachedDate || cachedDate > readDate) return;
      this.reading.delete(path);

      if (!this.conventions.ignored(path)) {
        this._compile(this._get(path));
      }

      if (!this.initial) this._compileDependencyParents(path);
      this._resetTimer();
    } catch (error) {
      if (!this.disposed) {
        throw new BrunchError('READ_FAILED', {path, error});
      }
    };
  }

  _unlink(path) {
    if (this.conventions.ignored(path)) {
      this._compileDependencyParents(path);
    } else {
      const file = this._get(path, false);
      if (file && !file.disposed) file.removed = true;
    }
    this._resetTimer();
  }

  _resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.cleanDisposedFiles();
      if (this.hasPendingFiles) {
        // loop
        this._resetTimer();
      } else {
        this.compiled.clear();
        // TODO: serialize fileList and write
        this.emit('ready');
      }
    }, this.resetTime);
  }

  dispose() {
    this.files.forEach(file => file.dispose());
    this.assets.forEach(file => file.dispose());


    this.files.clear();
    this.files = frozenMap;
    this.assets.clear();
    this.assets = frozenMap;

    this.reading = frozenMap;
    this.compiling = frozenSet;
    this.compiled = frozenSet;

    this.disposed = true;
    this.removeAllListeners();
    clearTimeout(this.timer);

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = FileList;
