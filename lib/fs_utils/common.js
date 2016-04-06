'use strict';
const basename = require('path').basename;

// Common helpers for file system.

// RegExps that filter out invalid files (dotfiles, emacs caches etc).
const apacheRe = /\.(?!htaccess|rewrite)/;
const dotfilesRe = /(^[.#]|(?:__|~)$)/;

exports.isIgnored = (path) => {
  const base = basename(path);
  return apacheRe.test(base) && dotfilesRe.test(base);
};
