'use strict';
const debug = require('debug')('brunch:file-list');
const EventEmitter = require('events').EventEmitter;
const normalize = require('path').normalize;
const fcache = require('fcache');
const Asset = require('./asset');
const SourceFile = require('./source_file');
const formatError = require('../helpers').formatError;

const startsWith = (string, substring) => {
  return string.lastIndexOf(substring, 0) === 0;
};


/* A list of `fs_utils.SourceFile` or `fs_utils.Asset`
 * with some additional methods used to simplify file reading / removing.
 */

class FileList {
  constructor(config) {
    /* Maximum time between changes of two files that will be considered
     * as a one compilation.
     */
    this.resetTime = 65;

    this.config = config;
    EventEmitter.call(this);
    this.files = [];
    this.assets = [];
    this.on('change', this._change);
    this.on('unlink', this._unlink);
    this.compiling = {};
    this.compiled = {};
    this.copying = {};
    this.initial = true;
    const interval = this.config.fileListInterval;
    if (typeof interval === 'number') {
      this.resetTime = interval;
    }
  }

  getAssetErrors() {
    const invalidAssets = this.assets.filter(asset => {
      return asset.error != null;
    });
    if (invalidAssets.length > 0) {
      return invalidAssets.map(invalidAsset => {
        return formatError(invalidAsset.error, invalidAsset.path);
      });
    } else {
      return null;
    }
  };

  isIgnored(path, test) {
    if (test == null) {
      test = this.config.conventions.ignored;
    }
    if (this.config._normalized.paths.allConfigFiles.indexOf(path) >= 0) {
      return true;
    }
    switch (toString.call(test).slice(8, -1)) {
      case 'RegExp':
        return path.match(test);
      case 'Function':
        return test(path);
      case 'String':
        return startsWith(normalize(path), normalize(test));
      case 'Array':
        return test.some((_this => {
          return subTest => {
            return _this.isIgnored(path, subTest);
          };
        })(this));
      default:
        return false;
    }
  };

  is(name, path) {
    const convention = this.config._normalized.conventions[name];
    if (!convention) {
      return false;
    }
    if (typeof convention !== 'function') {
      throw new TypeError("Invalid convention " + convention);
    }
    return convention(path);
  };

  resetTimer() {
    if (this.timer != null) {
      clearTimeout(this.timer);
    }
    return this.timer = setTimeout((_this => {
      return () => {
        _this.files = _this.files.filter(file => {
          return !file.disposed;
        });
        if (Object.keys(_this.compiling).length === 0 && Object.keys(_this.copying).length === 0) {
          _this.emit('ready');
          return _this.compiled = {};
        } else {
          return _this.resetTimer();
        }
      };
    })(this), this.resetTime);
  };

  find(path) {
    return this.files.filter(file => {
      return file.path === path;
    })[0];
  };

  findAsset(path) {
    return this.assets.filter(file => {
      return file.path === path;
    })[0];
  };

  compileDependencyParents(path) {
    const compiled = this.compiled;
    const parents = this.files.filter(dependent => {
      return dependent.dependencies && dependent.dependencies.length > 0 && dependent.dependencies.indexOf(path) >= 0 && !compiled[dependent.path];
    });
    if (parents.length) {
      const parentsList = parents.map(_ => {
        return _.path;
      }).join(', ');
      debug("Compiling dependency '" + path + "' parent(s): " + parentsList);
      return parents.forEach(this.compile);
    }
  };

  compile(file) {
    file.removed = false;
    const path = file.path;
    if (this.compiling[path]) {
      return this.resetTimer();
    } else {
      this.compiling[path] = true;
      return file.compile((_this => {
        return error => {
          delete _this.compiling[path];
          _this.resetTimer();
          if (error != null) {
            return;
          }
          debug("Compiled file '" + path + "'...");
          _this.compiled[path] = true;
          return _this.emit('compiled', path);
        };
      })(this));
    }
  };

  copy(asset) {
    const path = asset.path;
    this.copying[path] = true;
    return asset.copy((_this => {
      return error => {
        delete _this.copying[path];
        _this.resetTimer();
        if (error != null) {
          return;
        }
        return debug("Copied asset '" + path + "'");
      };
    })(this));
  };

  _add(path, compiler, linters, isHelper) {
    const isVendor = this.is('vendor', path);
    const wrapper = this.config._normalized.modules.wrapper;
    const file = new SourceFile(path, compiler, linters, wrapper, isHelper, isVendor);
    this.files.push(file);
    return file;
  };

  _addAsset(path) {
    const file = new Asset(path, this.config.paths["public"], this.config._normalized.conventions.assets);
    this.assets.push(file);
    return file;
  };

  _change(path, compiler, linters, isHelper) {
    const ignored = this.isIgnored(path);
    if (this.is('assets', path)) {
      if (!ignored) {
        const file = this.findAsset(path) || this._addAsset(path);
        return this.copy(file);
      }
    } else {
      debug("Reading '" + path + "'");
      return fcache.updateCache(path, (_this => {
        return (error, source) => {
          if (error) {
            if (error != null) {
              return console.log('Reading', error);
            }
          }
          if (!ignored && (compiler && compiler.length)) {
            const sourceFile = _this.find(path) || _this._add(path, compiler, linters, isHelper);
            _this.compile(sourceFile);
          }
          if (!_this.initial) {
            return _this.compileDependencyParents(path);
          }
        };
      })(this));
    }
  };

  _unlink(path) {
    const ignored = this.isIgnored(path);
    if (this.is('assets', path)) {
      if (!ignored) {
        this.assets.splice(this.assets.indexOf(path), 1);
      }
    } else {
      if (ignored) {
        this.compileDependencyParents(path);
      } else {
        const file = this.find(path);
        if (file && !file.disposed) {
          file.removed = true;
        }
      }
    }
    this.resetTimer();
  };
}

FileList.prototype.__proto__ = EventEmitter.prototype;

module.exports = FileList;
