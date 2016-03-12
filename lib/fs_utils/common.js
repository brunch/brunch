'use strict';
const debug = require('debug')('brunch:common');
const copyFile = require('quickly-copy-file');
const promisify = require('micro-promisify');
const fswriteFile = promisify(require('fs').writeFile);
const mkdirp = promisify(require('mkdirp'));
const sysPath = require('path');

// Common helpers for file system.

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

const perm0755 = 0x1ed;
exports.writeFile = (path, data) => {
  debug(`Writing ${path}`);
  const write = () => fswriteFile(path, data);
  return write().catch(() => {
    return mkdirp(sysPath.dirname(path), perm0755).then(write);
  });
};

/* RegExps that filter out invalid files (dotfiles, emacs caches etc). */
const apacheRe = /\.(?!htaccess|rewrite)/;
const dotfilesRe = /(^[.#]|(?:__|~)$)/;
const alwaysIgnoredRe = /^\.(git|hg)$/;

const ignored = exports.ignored = path => {
  const base = sysPath.basename(path);
  return apacheRe.test(base) && dotfilesRe.test(base);
};

exports.ignoredAlways = path => alwaysIgnoredRe.test(sysPath.basename(path));

exports.copy = (source, destination) => {
  if (ignored(source)) return Promise.resolve();
  return copyFile(source, destination);
};
