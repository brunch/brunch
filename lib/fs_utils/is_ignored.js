'use strict';
const basename = require('universal-path').basename;

// RegExps that filter out invalid files (dotfiles, emacs caches etc).
const apacheRe = /\.(?!htaccess|rewrite)/;
const dotfilesRe = /(^[.#]|(?:__|~)$)/;

module.exports = path => {
  const name = basename(path);
  return apacheRe.test(name) && dotfilesRe.test(name);
};
