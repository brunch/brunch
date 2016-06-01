'use strict';
const sysPath = require('../path');
const debug = require('debug')('brunch:list');
const EventEmitter = require('events').EventEmitter;
const normalize = require('../path').normalize;
const readFileAndCache = require('fcache').updateCache;
const deppack = require('deppack'); // isNpmJSON, isNpm
const formatError = require('../helpers').formatError;
const Asset = require('./asset');
const SourceFile = require('./source_file');

const startsWith = (string, substring) => {
  return string.lastIndexOf(substring, 0) === 0;
};

const normalizePath = (path) => sysPath.slashes(path);

// File list.
// A list of SourceFiles that contains *all* files from Brunches app.

// A list of `fs_utils.SourceFile` or `fs_utils.Asset`
// with some additional methods used to simplify file reading / removing.
const defaultInterval = 65;
class FileList extends EventEmitter {
  constructor(config, watcher) {
    super();
    const interval = config.fileListInterval;
    const norm = config._normalized;

    // Maximum time between changes of two files that
    // will be considered as a one compilation.
    this.resetTime = interval || defaultInterval;
    this.timer = null;
    this.watcher = watcher;

    // Grab values from config.
    this.publicPath = config.paths.public;
    this.conventions = norm.conventions;
    this.moduleWrapper = norm.modules.wrapper;
    this.configPaths = norm.paths.allConfigFiles;
    this.depCompilers = config.npm.compilers;

    this.files = new Map();
    this.staticFiles = new Map();
    this.assets = [];
    this.compiling = new Set();
    this.copying = new Set();
    this.compiled = new Set();
    this.initial = true;
    this.disposed = false;

    this.on('change', this._change);
    this.on('unlink', this._unlink);

    Object.seal(this); // Disallow adding new properties.
  }

  getAssetErrors() {
    const invalid = this.assets.filter(a => a.error);
    if (invalid.length > 0) {
      return invalid.map(iv => formatError(iv.error, iv.path));
    } else {
      return null;
    }
  }

  isIgnored(path, test) {
    if (deppack.isNpm(path)) return false;
    if (!test) test = this.conventions.ignored;
    if (this.configPaths.indexOf(path) >= 0) return true;
    switch (toString.call(test).slice(8, -1)) {
      case 'RegExp': return path.match(test);
      case 'Function': return test(path);
      case 'String': return startsWith(normalize(path), normalize(test));
      case 'Array': return test.some(subTest => this.isIgnored(path, subTest));
      default: return false;
    }
  }

  is(name, path) {
    const convention = this.conventions[name];
    if (!convention) return false;
    if (typeof convention !== 'function') {
      throw new TypeError('Invalid convention ' + convention);
    }
    return convention(path);
  }

  hasPendingFiles() {
    return this.compiling.size > 0 || this.copying.size > 0;
  }

  resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.removeDisposedFiles();
      if (this.hasPendingFiles()) {
        this.resetTimer();
      } else {
        this.emit('ready');
        this.compiled.clear();
      }
    }, this.resetTime);
  }

  removeDisposedFiles() {
    this.files.forEach((file, p) => file.disposed && this.files.delete(p));
    this.staticFiles.forEach((file, p) => file.disposed && this.staticFiles.delete(p));
  }

  find(path) {
    path = normalizePath(path);
    return this.files.get(path);
  }

  findAsset(path) {
    path = normalizePath(path);
    return this.assets.find(file => file.path === path);
  }

  findStatic(path) {
    path = normalizePath(path);
    return this.staticFiles.get(path);
  }

  compileDependencyParents(path, isStatic) {
    path = normalizePath(path);
    const paths = [];
    const parents = [];
    const files = isStatic ? this.staticFiles : this.files;
    files.forEach((dependent, fpath) => {
      const deps = dependent.dependencies;
      const isDep = deps && deps.length > 0 &&
        deps.indexOf(path) >= 0 &&
        !this.compiled.has(fpath);
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
    } else {
      const reset = (p) => {
        this.compiling.delete(path);
        this.resetTimer();
        return p;
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
  }

  copy(asset) {
    const path = asset.path;
    const resetCopy = (p) => {
      if (this.disposed) { return p; }
      this.copying.delete(path);
      this.resetTimer();
      return p;
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
    } catch (e) {
      require('loggy').error(e);
      return;
    }
  }

  _change(path, compiler, linters, isHelper) {
    if (this.disposed) { return; }

    const ignored = this.isIgnored(path);
    const isAsset = this.is('assets', path);
    const isStatic = isAsset && compiler.length > 0;
    const isRegularAsset = isAsset && !isStatic;

    if (isRegularAsset) {
      if (!ignored) {
        const file = this.findAsset(path) || this._addAsset(path);
        this.copy(file);
      }
    } else {
      debug(`Reading ${path}`);
      readFileAndCache(path, error => {
        if (this.disposed) { return; }
        if (error) throw new Error(formatError('Reading', error));
        // .json files from node_modules should always be compiled
        if (!isAsset && !ignored && (compiler && compiler.length) || deppack.isNpmJSON(path)) {
          const sourceFile = this.find(path) ||
            this._add(path, compiler, linters, isHelper);
          this.compile(sourceFile);
        } else if (isStatic && !ignored) {
          const staticFile = this.findStatic(path) || this._addStatic(path, compiler);
          this.compile(staticFile);
        }
        if (!this.initial) this.compileDependencyParents(path, isStatic);
        // When the file was ignored.
        this.resetTimer();
      });
    }
  }

  _unlink(path) {
    const ignored = this.isIgnored(path);
    const isAsset = this.is('assets', path);
    const isStatic = isAsset && this.findStatic(path);
    const isRegularAsset = isAsset && !isStatic;

    if (isRegularAsset) {
      if (!ignored) this.assets.splice(this.assets.indexOf(path), 1);
    } else {
      if (ignored) {
        this.compileDependencyParents(path);
      } else {
        const file = isStatic ? this.findStatic(path) : this.find(path);
        if (file && !file.disposed) file.removed = true;
      }
    }
    this.resetTimer();
  }

  dispose() {
    this.removeAllListeners();
    clearTimeout(this.timer);
    this.files.forEach(file => file.dispose());
    this.staticFiles.forEach(file => file.dispose());
    this.assets.forEach(file => file.dispose());
    ['compiling', 'copying', 'compiled', 'files', 'staticFiles'].forEach(k => {
      this[k].clear();
      this[k] = null;
    });
    this.assets.splice(0);
    this.disposed = true;

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = FileList;
