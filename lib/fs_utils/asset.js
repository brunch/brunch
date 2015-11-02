'use strict';
const debug = require('debug')('brunch:asset');
const sysPath = require('path');
const common = require('./common');
const isWindows = require('../helpers').isWindows;

/* Directory separator. */
const separator = sysPath.sep;

/* Get first parent directory that matches asset convention.
 *
 * Example:
 *   getAssetDirectory 'app/assets/thing/thing2.html', /assets/
 *   # app/assets/
 *
 * Returns String.
 */
const getAssetDirectory = (path, convention) => {
  const split = path.split(separator);

  /* Creates thing like this
   * 'app/', 'app/assets/', 'app/assets/thing/', 'app/assets/thing/thing2.html/'
   */
  return split.map((part, index) => {
    return split.slice(0, index).concat([part, '']).join(separator);
  }).filter(convention)[0];
};


/* A static file that shall be copied to public directory. */

class Asset {
  constructor(path, publicPath, assetsConvention) {
    const directory = getAssetDirectory(path, assetsConvention);
    this.path = path;
    this.relativePath = sysPath.relative(directory, path);
    this.destinationPath = sysPath.join(publicPath, this.relativePath);
    this.error = null;
    this.copyTime = null;
    Object.seal(this);
    debug("Initializing fs_utils.Asset %s", JSON.stringify({
      path: path,
      directory: directory,
      relativePath: this.relativePath,
      destinationPath: this.destinationPath
    }));
  }

  /* Copy file to public directory. */
  copy() {
    const saveTime = (p) => {
      this.copyTime = Date.now();
      return p;
    };
    return common.copy(this.path, this.destinationPath)
      .then(saveTime, saveTime)
      .then(() => {
        this.error = null;
        return Promise.resolve();
      }, err => {
        let error = new Error(err);
        error.code = 'Copying';
        this.error = error;
        return Promise.reject(this.error);
      });
  };
}

module.exports = Asset;
