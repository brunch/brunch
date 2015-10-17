'use strict';
const promisify = require('../promise').promisify;
const debug = require('debug')('brunch:common');
const copyFile = require('quickly-copy-file');
const fs = require('fs');
const mkdirp = require('mkdirp');
const sysPath = require('path');

/* Writes data into a file.
 * Creates the file and/or all parent directories if they don't exist.
 *
 * path - String. Path to the file.
 * data - String. Data to be written.
 *
 * Example
 *
 *   writeFile 'test.txt', 'data', (error) -> console.log error if error?
 *
 * Returns a promise (not valued if success).
 */

exports.writeFile = (path, data) => {
  debug(`Writing file '${path}'`);

  const write = () => { return promisify(fs.writeFile)(path, data); };

  return write()
    .catch(() => {
      return promisify(mkdirp)(sysPath.dirname(path), 0x1ed).then(write);
    });
};

/* RegExp that filters out invalid files (dotfiles, emacs caches etc). */

const re1 = /\.(?!htaccess|rewrite)/;
const re2 = /(^[.#]|(?:__|~)$)/;
const re3 = /^\.(git|hg)$/;
const ignored = exports.ignored = path => {
  const base = sysPath.basename(path);
  return re1.test(base) && re2.test(base);
};

exports.ignoredAlways = path => re3.test(sysPath.basename(path));

exports.copy = (source, destination) => {
  if (ignored(source))
    return Promise.resolve();
  return promisify(copyFile)(source, destination);
};
