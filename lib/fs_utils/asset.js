'use strict';
const debug = require('debug')('brunch:asset');
const sysPath = require('path');
const copyFile = require('quickly-copy-file');
const prettify = require('../helpers').prettify;
const isIgnored = require('./common').isIgnored;

// Asset: Simple abstraction on top of static assets that are not compiled.

// Get first parent directory that matches asset convention.
// getAssetDirectory('app/assets/thing/thing2.html', /assets/)
// => 'app/assets/'
// Returns String.
const getAssetDirectory = (path, convention) => {
  const sep = sysPath.sep;
  const split = path.split(sep);

  // Creates thing like this
  // ['app/', 'app/assets/', 'app/assets/thing/', 'app/assets/thing/item.html/']
  return split.map((part, index) => {
    return split.slice(0, index).concat([part, '']).join(sep);
  }).find(convention);
};


// A static file that shall be copied to public directory.
class Asset {
  constructor(path, publicPath, assetsConvention) {
    const directory = getAssetDirectory(path, assetsConvention);
    const rel = sysPath.relative(directory, path);
    const destPath = sysPath.join(publicPath, rel);
    this.path = path;
    this.destPath = destPath;
    this.error = null;
    this.copyTime = null;
    debug(`Init ${path} %s`, prettify({directory, destPath, rel}));
    Object.seal(this);
  }

  updateTime() {
    this.copyTime = Date.now();
  }

  // Copy file to public directory.
  copy() {
    const path = this.path;
    if (isIgnored(path)) return Promise.resolve();
    return copyFile(path, this.destPath).then(() => {
      debug(`Copied ${path}`);
      this.updateTime();
      this.error = null;
      return Promise.resolve();
    }, err => {
      debug(`Cannot copy ${path}: ${err}`);
      this.updateTime();
      const error = new Error(err);
      error.code = 'Copying';
      this.error = error;
      return Promise.reject(this.error);
    });
  }

  dispose() {
    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = Asset;
