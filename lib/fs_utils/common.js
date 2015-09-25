'use strict';
const debug = require('debug')('brunch:common');
const copyFile = require('quickly-copy-file');
const fs = require('fs');
const mkdirp = require('mkdirp');
const sysPath = require('path');

/* Supports node 0.12+, 0.8 and 0.6 styles. */

exports.exists = fs.access ? function(path, callback) {
  fs.access(path, error => callback(!error));
} : fs.exists || sysPath.exists;


/* Writes data into a file.
 * Creates the file and/or all parent directories if they don't exist.
 *
 * path - String. Path to the file.
 * data - String. Data to be written.
 * callback(error, path, data) - Executed on error or on
 *    successful write.
 *
 * Example
 *
 *   writeFile 'test.txt', 'data', (error) -> console.log error if error?
 *
 * Returns nothing.
 */

exports.writeFile = (path, data, callback) => {
  debug("Writing file '" + path + "'");
  const write = function(callback) {
    return fs.writeFile(path, data, callback);
  };
  write(function(error) {
    if (error == null) {
      return callback(null, path, data);
    }
    mkdirp(sysPath.dirname(path), 0x1ed, function(error) {
      if (error != null) {
        return callback(error);
      }
      write(function(error) {
        callback(error, path, data);
      });
    });
  });
};


/* RegExp that filters out invalid files (dotfiles, emacs caches etc). */

const ignored = exports.ignored = (function() {
  const re1 = /\.(?!htaccess|rewrite)/;
  const re2 = /(^[.#]|(?:__|~)$)/;
  return path => {
    const base = sysPath.basename(path);
    return re1.test(base) && re2.test(base);
  };
})();

exports.ignoredAlways = function(path) {
  return /^\.(git|hg)$/.test(sysPath.basename(path));
};

exports.copy = function(source, destination, callback) {
  if (ignored(source)) {
    return callback();
  }
  return copyFile(source, destination, callback);
};
