'use strict';
const sysPath = require('universal-path');
const normalizePath = sysPath.slashes;
const debug = require('debug')('brunch:list');
const EventEmitter = require('events').EventEmitter;
const readAndCache = require('fcache').updateCache;
const deppack = require('deppack'); // isNpmJSON, isNpm
const formatError = require('../utils/helpers').formatError;
const Asset = require('./asset').Asset;
const CompiledAsset = require('./asset').CompiledAsset;
const FrozenMap = require('../utils/helpers').FrozenMap;
const FrozenSet = require('../utils/helpers').FrozenSet;
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
    this.timer = null;

    const norm = config._normalized;

    // Grab values from config.
    this.publicPath = norm.paths.public;
    this.conventions = norm.conventions;
    this.moduleWrapper = norm.modules.wrapper;
    this.depCompilers = config.npm.compilers;

    this.files = new Map();
    this.staticFiles = new Map();
    this.assets = new Map();

    this.reading = new Map();
    this.compiling = new Set();
    this.copying = new Set();
    this.compiled = new Set();

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
    return !!(this.files.size || this.staticFiles.size);
  }

  get hasPendingFiles() {
    return !!(this.reading.size || this.compiling.size || this.copying.size);
  }

  }

  removeDisposedFiles() {
    this.files.forEach((file, path) => file.disposed && this.files.delete(path));
    this.staticFiles.forEach((file, path) => file.disposed && this.staticFiles.delete(path));
  }

  find(path) {
    return this.files.get(normalizePath(path));
  }

  findAsset(path) {
    return this.assets.get(normalizePath(path));
  }

  findStatic(path) {
    return this.staticFiles.get(normalizePath(path));
  }

  compileDependencyParents(path, isStatic) {
    path = normalizePath(path);
    const paths = [];
    const parents = [];
    const files = isStatic ? this.staticFiles : this.files;
    files.forEach((dependent, fpath) => {
      const deps = dependent.dependencies;
      const isDep = anymatch(deps, path) && !this.compiled.has(fpath);
      if (!isDep) return;
      paths.push(fpath);
      parents.push(dependent);
    });
    if (!parents.length) return;
    debug(`Compiling ${isStatic ? 'static ' : ''}dependency ${path} parent(s): ${paths.join(', ')}`);
    parents.forEach(file => this.compile(file));
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

  copy(asset) {
    const path = asset.path;
    this.copying.add(path);

    return asset.copy().finally(() => {
      if (this.disposed) return;
      this.copying.delete(path);
      this.resetTimer();
    });
  }

  copiedAfter(time) {
    return Array.from(this.assets.values()).filter(asset => {
      return asset.copyTime > time;
    });
  }

  _add(path, compiler, linters, isHelper) {
    const isVendor = this.conventions.vendor(path);
    const wrapper = this.moduleWrapper;
    const file = new SourceFile(
      normalizePath(path), compiler, linters, wrapper, isHelper, isVendor, this, this.depCompilers
    );
    this.files.set(file.path, file);
    return file;
  }

  _addAsset(path) {
    const file = new Asset(path, this.publicPath, this.conventions.assets);
    this.assets.set(file.path, file);
    return file;
  }

  _addStatic(path, compiler) {
    const file = new CompiledAsset(path, this.publicPath, this.conventions.assets, compiler);
    this.staticFiles.set(file.path, file);
    return file;
  }

  _change(path, compiler, linters, isHelper) {
    if (this.disposed) return;

    const ignored = this.conventions.ignored(path);
    const isAsset = this.conventions.assets(path);
    const isStatic = isAsset && compiler.length > 0;
    const isRegularAsset = isAsset && !isStatic;

    if (isRegularAsset && !ignored) {
      const file = this.findAsset(path) || this._addAsset(path);
      this.copy(file);
      return;
    }
    if (this.reading.has(path)) return;

    debug(`Reading ${path}`);
    const readDate = Date.now();
    this.reading.set(path, readDate);

    readAndCache(path).then(() => {
      const cachedDate = this.reading.get(path);
      if (this.disposed || !cachedDate || cachedDate > readDate) return;
      this.reading.delete(path);
      // .json files from node_modules should always be compiled
      if (!isAsset && !ignored && (compiler && compiler.length) || deppack.isNpmJSON(path)) {
        const sourceFile = this.find(path) ||
          this._add(path, compiler, linters, isHelper);
        this.compile(sourceFile);
      } else if (isStatic && !ignored) {
        const staticFile = this.findStatic(path) ||
          this._addStatic(path, compiler);
        this.compile(staticFile);
      }
      if (!this.initial) this.compileDependencyParents(path, isStatic);
      // When the file was ignored.
      this._resetTimer();
    }, error => {
      if (!this.disposed) {
        throw new BrunchError('READ_FAILED', {path, error});
      }
    });
  }

  _unlink(path) {
    const ignored = this.conventions.ignored(path);
    const isAsset = this.conventions.assets(path);
    const isStatic = isAsset && this.findStatic(path);
    const isRegularAsset = isAsset && !isStatic;

    if (isRegularAsset && !ignored) {
      this.assets.delete(path);
    } else if (ignored) {
      this.compileDependencyParents(path);
    } else {
      const file = isStatic ? this.findStatic(path) : this.find(path);
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
