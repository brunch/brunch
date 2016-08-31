'use strict';
const sysPath = require('universal-path');
const normalizePath = sysPath.slashes;
const normalize = sysPath.normalize;
const debug = require('debug')('brunch:list');
const EventEmitter = require('events').EventEmitter;
const readFileAndCache = require('fcache').updateCache;
const deppack = require('deppack'); // isNpmJSON, isNpm
const formatError = require('../utils/helpers').formatError;
const Asset = require('./asset');
const SourceFile = require('./source_file');
const BrunchError = require('../utils/error');
const anymatch = require('anymatch');
const logger = require('loggy');

// File list.
// A list of SourceFiles that contains *all* files from Brunches app.

// A list of `fs_utils.SourceFile` or `fs_utils.Asset`
// with some additional methods used to simplify file reading / removing.
class FileList extends EventEmitter {
  constructor(config, watcher) {
    super();

    // Maximum time between changes of two files that
    // will be considered as a one compilation.
    this.resetTime = config.fileListInterval;
    this.timer = null;
    this.watcher = watcher;

    const norm = config._normalized;

    // Grab values from config.
    this.publicPath = config.paths.public;
    this.conventions = norm.conventions;
    this.moduleWrapper = norm.modules.wrapper;
    this.configPaths = norm.paths.allConfigFiles;
    this.depCompilers = config.npm.compilers;

    this.files = new Map();
    this.staticFiles = new Map();
    this.assets = [];
    this.reading = new Map();
    this.compiling = new Set();
    this.copying = new Set();
    this.compiled = new Set();
    this.initial = true;
    this.disposed = false;

    this.on('change', this._change);
    this.on('unlink', this._unlink);

    // Disallow adding new properties.
    Object.seal(this);
  }

  get assetErrors() {
    return this.assets
      .filter(asset => asset.error)
      .map(formatError);
  }

  isIgnored(path, test) {
    if (deppack.isNpm(path)) return false;
    if (!test) test = this.conventions.ignored;
    if (this.configPaths.includes(path)) return true;
    switch (toString.call(test).slice(8, -1)) {
      case 'RegExp': return path.match(test);
      case 'Function': return test(path);
      case 'String': return normalize(path).startsWith(normalize(test));
      case 'Array': return test.some(subTest => this.isIgnored(path, subTest));
    }
    return false;
  }

  is(name, path) {
    const convention = this.conventions[name];
    if (!convention) return false;
    if (typeof convention !== 'function') {
      throw new BrunchError('CONVENTION_INVALID', {convention});
    }
    return convention(path);
  }

  get hasFiles() {
    return !!(this.files.size || this.staticFiles.size);
  }

  get hasPendingFiles() {
    return !!(this.reading.size || this.compiling.size || this.copying.size);
  }

  resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.removeDisposedFiles();
      if (this.hasPendingFiles) {
        this.resetTimer();
      } else {
        this.emit('ready');
        this.compiled.clear();
      }
    }, this.resetTime);
  }

  removeDisposedFiles() {
    this.files.forEach((file, path) => file.disposed && this.files.delete(path));
    this.staticFiles.forEach((file, path) => file.disposed && this.staticFiles.delete(path));
  }

  find(path) {
    return this.files.get(normalizePath(path));
  }

  findAsset(path) {
    path = normalizePath(path);
    return this.assets.find(file => file.path === path);
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
    parents.forEach(this.compile, this);
  }

  compile(file) {
    const path = file.path;
    file.removed = false;
    if (this.compiling.has(path)) {
      this.resetTimer();
      return;
    }
    const reset = () => {
      this.compiling.delete(path);
      this.resetTimer();
    };
    this.compiling.add(path);
    file.compile()
      .then(reset, reset)
      .then(() => {
        debug(`Compiled ${path}`);
        this.compiled.add(path);
        this.emit('compiled', path);
      });
  }

  copy(asset) {
    const path = asset.path;
    const resetCopy = () => {
      if (this.disposed) return;
      this.copying.delete(path);
      this.resetTimer();
    };

    this.copying.add(path);
    return asset.copy().then(resetCopy, resetCopy);
  }

  _add(path, compiler, linters, isHelper) {
    const isVendor = this.is('vendor', path);
    const wrapper = this.moduleWrapper;
    const file = new SourceFile(
      normalizePath(path), compiler, linters, wrapper, isHelper, isVendor, this, this.depCompilers
    );
    this.files.set(file.path, file);
    return file;
  }

  _addAsset(path) {
    const file = new Asset(path, this.publicPath, this.conventions.assets);
    this.assets.push(file);
    return file;
  }

  _addStatic(path, compiler) {
    try {
      const file = new Asset.Static(path, this.publicPath, this.conventions.assets, compiler);
      this.staticFiles.set(file.path, file);
      return file;
    } catch (err) {
      logger.error(err);
    }
  }

  _change(path, compiler, linters, isHelper) {
    if (this.disposed) return;

    const ignored = this.isIgnored(path);
    const isAsset = this.is('assets', path);
    const isStatic = isAsset && compiler.length > 0;
    const isRegularAsset = isAsset && !isStatic;

    if (isRegularAsset && !ignored) {
      const file = this.findAsset(path) || this._addAsset(path);
      this.copy(file);
      return;
    }

    debug(`Reading ${path}`);
    // TODO: What if it's in reading already?
    const readDate = Date.now();
    this.reading.set(path, readDate);
    readFileAndCache(path).then(() => {
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
      this.resetTimer();
    }, error => {
      if (!this.disposed) {
        throw new BrunchError('READ_FAILED', {path, error});
      }
    });
  }

  _unlink(path) {
    const ignored = this.isIgnored(path);
    const isAsset = this.is('assets', path);
    const isStatic = isAsset && this.findStatic(path);
    const isRegularAsset = isAsset && !isStatic;

    if (isRegularAsset && !ignored) {
      this.assets.splice(this.assets.indexOf(path), 1);
    } else if (ignored) {
      this.compileDependencyParents(path);
    } else {
      const file = isStatic ? this.findStatic(path) : this.find(path);
      if (file && !file.disposed) file.removed = true;
    }
    this.resetTimer();
  }

  dispose() {
    this.removeAllListeners();
    clearTimeout(this.timer);
    this.files.forEach(file => file.dispose());
    this.staticFiles.forEach(file => file.dispose());
    this.assets.forEach(file => file.dispose());
    ['compiling', 'copying', 'compiled', 'files', 'staticFiles'].forEach(key => {
      this[key].clear();
      this[key] = null;
    });
    this.assets.splice(0);
    this.disposed = true;

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = FileList;
