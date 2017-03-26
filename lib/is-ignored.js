'use strict';
const {basename} = require('universal-path');

// RegExps that filter out invalid files (dotfiles, emacs caches etc).
const apacheRe = /\.(?!htaccess|rewrite)/;
const dotfilesRe = /(^[.#]|(?:__|~)$)/;
const dotfilesRe = /^[.#~]|__$/;

module.exports = path => {
  const base = basename(path);
  return apacheRe.test(base) && dotfilesRe.test(base);
};
