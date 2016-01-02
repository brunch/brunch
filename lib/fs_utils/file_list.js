'use strict';
const debug = require('debug')('brunch:list');
const EventEmitter = require('events').EventEmitter;
const normalize = require('path').normalize;
const fcache = require('fcache');
const Asset = require('./asset');
const SourceFile = require('./source_file');
const formatError = require('../helpers').formatError;

const startsWith = (string, substring) => {
  return string.lastIndexOf(substring, 0) === 0;
};

// File list.
// A list of SourceFiles that contains *all* files from Brunches app.

/* A list of `fs_utils.SourceFile` or `fs_utils.Asset`
 * with some additional methods used to simplify file reading / removing.
 */

class FileList {
  constructor(config) {
    EventEmitter.call(this);

    /* Maximum time between changes of two files that will be considered
     * as a one compilation.
     */
    this.resetTime = 65;

    // Grab values from config.
    this.publicPath = config.paths['public'];
    const interval = config.fileListInterval;
    const norm = config._normalized;
    this.conventions = norm.conventions;
    this.moduleWrapper = norm.modules.wrapper;
    this.configPaths = norm.paths.allConfigFiles;

    this.files = [];
    this.assets = [];
    this.compiling = {};
    this.compiled = {};
    this.copying = {};
    this.initial = true;

    this.on('change', this._change);
    this.on('unlink', this._unlink);
    if (typeof interval === 'number') this.resetTime = interval;
  }

  getAssetErrors() {
    const invalid = this.assets.filter(a => a.error != null);
    if (invalid.length > 0) {
      return invalid.map(iv => formatError(iv.error, iv.path));
    } else {
      return null;
    }
  }

  isIgnored(path, test) {
    if (test == null) test = this.conventions.ignored;
    if (this.configPaths.indexOf(path) >= 0) return true;
    switch (toString.call(test).slice(8, -1)) {
      case 'RegExp':
        return path.match(test);
      case 'Function':
        return test(path);
      case 'String':
        return startsWith(normalize(path), normalize(test));
      case 'Array':
        return test.some(subTest => this.isIgnored(path, subTest));
      default:
        return false;
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

  hasFiles() {
    for (const ignored in this.compiling) return true;
    for (const ignored in this.copying) return true;
    return false;
  }

  resetTimer() {
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.files = this.files.filter(file => !file.disposed);
      if (this.hasFiles()) {
        this.resetTimer();
      } else {
        this.emit('ready');
        this.compiled = {};
      }
    }, this.resetTime);
  }

  find(path) {
    const files = this.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.path === path) return file;
    }
  }

  findAsset(path) {
    const files = this.assets;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.path === path) return file;
    }
  }

  compileDependencyParents(path) {
    const compiled = this.compiled;
    const parents = this.files.filter(dependent => {
      const deps = dependent.dependencies;
      return deps && deps.length > 0 &&
             deps.indexOf(path) >= 0 &&
             !compiled[dependent.path];
    });
    if (!parents.length) return;
    const parentsList = parents.map(p => p.path).join(', ');
    debug(`Compiling dependency ${path} parent(s): ${parentsList}`);
    parents.forEach(this.compile, this);
  }

  compile(file) {
    const path = file.path;
    file.removed = false;
    if (this.compiling[path]) {
      this.resetTimer();
    } else {
      const reset = (p) => {
        delete this.compiling[path];
        this.resetTimer();
        return p;
      };
      this.compiling[path] = true;
      file.compile()
          .then(reset, reset)
          .then(() => {
            debug(`Compiled ${path}`);
            this.compiled[path] = true;
            this.emit('compiled', path);
          });
    }
  }

  copy(asset) {
    const resetCopy = (p) => {
      delete this.copying[path];
      this.resetTimer();
      return p;
    };

    const path = asset.path;
    this.copying[path] = true;
    return asset.copy().then(resetCopy, resetCopy);
  }

  _add(path, compiler, linters, isHelper) {
    const isVendor = this.is('vendor', path);
    const wrapper = this.moduleWrapper;
    const file = new SourceFile(
      path, compiler, linters, wrapper, isHelper, isVendor
    );
    this.files.push(file);
    return file;
  }

  _addAsset(path) {
    const file = new Asset(path, this.publicPath, this.conventions.assets);
    this.assets.push(file);
    return file;
  }

  _change(path, compiler, linters, isHelper) {
    const ignored = this.isIgnored(path);
    if (this.is('assets', path)) {
      if (!ignored) {
        const file = this.findAsset(path) || this._addAsset(path);
        this.copy(file);
      }
    } else {
      debug(`Reading ${path}`);
      fcache.updateCache(path, error => {
        if (error) throw new Error(formatError('Reading', error));
        if (!ignored && (compiler && compiler.length)) {
          const sourceFile = this.find(path) ||
            this._add(path, compiler, linters, isHelper);
          this.compile(sourceFile);
        }
        if (!this.initial) this.compileDependencyParents(path);
        // When the file was ignored.
        this.resetTimer();
      });
    }
  }

  _unlink(path) {
    const ignored = this.isIgnored(path);
    if (this.is('assets', path)) {
      if (!ignored) this.assets.splice(this.assets.indexOf(path), 1);
    } else {
      if (ignored) {
        this.compileDependencyParents(path);
      } else {
        const file = this.find(path);
        if (file && !file.disposed) file.removed = true;
      }
    }
    this.resetTimer();
  }
}

FileList.prototype.__proto__ = EventEmitter.prototype;

module.exports = FileList;
