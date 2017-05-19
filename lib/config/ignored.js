'use strict';
const {basename} = require('universal-path');

const backups = /[#~]$/;
const except = [
  '.htaccess',
  '.rewrite',
  '.well-known',
];

module.exports = path => {
  const base = basename(path);
  if (backups.test(base)) return true;

  return base.startsWith('.') &&
    !except.includes(base);
};
