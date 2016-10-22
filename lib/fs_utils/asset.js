'use strict';
const debug = require('debug')('brunch:asset');
const sysPath = require('universal-path');
const copyFile = require('quickly-copy-file');
const prettify = require('../utils/helpers').prettify;
const isIgnored = require('./common').isIgnored;
const pipeline = require('./pipeline');
const logger = require('loggy');
const BrunchError = require('../utils/error');

// Asset: Simple abstraction on top of static assets that are not compiled.

// Get first parent directory that matches asset convention.
// getAssetDirectory('app/assets/thing/thing2.html', /assets/)
// => 'app/assets/'
// Returns String.
const getAssetDirectory = (path, convention) => {
  const split = path.split('/');

  // Creates list similar to:
  // ['app/', 'app/assets/', 'app/assets/thing/', 'app/assets/thing/item.html/']
  return split.map((part, index) => {
    return split.slice(0, index).concat(part, '').join(sysPath.sep);
  }).find(convention);
};


// A static file that shall be copied to public directory.
class Asset {
  constructor(path, publicPath, assetsConvention) {
    const directory = getAssetDirectory(path, assetsConvention) || '';
    const rel = sysPath.relative(directory, path);
    const destinationPath = sysPath.join(publicPath, rel);
    this.path = path;
    this.destinationPath = destinationPath;
    this.error = null;
    this.copyTime = null;
    debug(`Init ${path} %s`, prettify({directory, destinationPath, rel}));
    Object.seal(this);
  }

  updateTime() {
    this.copyTime = Date.now();
  }

  // Copy file to public directory.
  copy() {
    const path = this.path;
    if (isIgnored(path)) return Promise.resolve();
    return copyFile(path, this.destinationPath).then(() => {
      debug(`Copied ${path}`);
      this.updateTime();
      this.error = null;
    }, error => {
      debug(`Cannot copy ${path}: ${error}`);
      this.updateTime();
      throw new BrunchError('COPY_FAILED', {path, error});
    });
  }

  dispose() {
    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

class CompiledAsset {
  constructor(path, publicPath, assetsConvention, compilers) {
    const compiler = compilers[0];
    if (compilers.length !== 1) {
      logger.warn(`Got ${compilers.length} compilers for a static file ${path}, proceeding with the first one: ${compiler.brunchPluginName}`);
    }
    const directory = getAssetDirectory(path, assetsConvention);
    const rel = sysPath.relative(directory, path);
    const destinationRel = rel.replace(compiler.staticPattern, `.${compiler.staticTargetExtension}`);
    const destinationPath = sysPath.join(publicPath, destinationRel);
    const compilerName = compiler.brunchPluginName;

    this.path = path;
    this.destinationPath = destinationPath;
    this.error = null;
    this.dependencies = [];
    this.removed = false;
    this.disposed = false;
    this.source = '';
    this.compiled = '';
    this.compilationTime = null;
    this._compiler = compiler;
    debug(`Init ${path} $`, prettify({directory, destinationPath, rel, compilerName}));
    Object.seal(this);
  }

  compile() {
    if (this.disposed) {
      throw new BrunchError('ALREADY_DISPOSED', {path: this.path});
    }

    return pipeline.compileStatic(this.path, this._compiler).then(data => {
      Object.assign(this, data);
    }, error => {
      this.error = error;
    });
  }

  dispose() {
    debug(`Disposing static ${this.path}`);
    this.dependencies = Object.freeze([]);
    this.disposed = true;
    this.error = null;
    this.source = '';
    this.compiled = '';
    this._compiler = null;

    Object.freeze(this);
  }
}

Asset.Static = CompiledAsset;
module.exports = Asset;
