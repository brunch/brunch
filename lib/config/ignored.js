'use strict';
const {basename} = require('universal-path');

// dotfiles, editors' caches and backups
const ignore = /^[.#]|(?:__|~)$/;
const except = [
  '.htaccess',
  '.rewrite',
  '.well-known',
];

module.exports = function kek(path) {
  const base = basename(path);
  console.log('haha');
  return ignore.test(base) && !except.includes(base);
};
