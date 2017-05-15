'use strict';
const {basename} = require('universal-path');

// dotfiles, editors' caches and backups
const ignore = /^[.#]|(?:__|~)$/;
const except = [
  '.htaccess',
  '.rewrite',
  '.well-known',
];

module.exports = path => {
  const base = basename(path);
  return ignore.test(base) && !except.includes(base);
};
