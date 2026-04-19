'use strict';
const sysPath = require('./path');
const fs = require('fs');

const isRelative = path => path.slice(0, 2) === './' || path.slice(0, 3) === '../';
const makeRelative = path => sysPath.relative(process.cwd(), path);
const not = f => i => !f(i);

const exists = path => new Promise(resolve => fs.exists(path, resolve));

module.exports = {makeRelative, isRelative, not, exists};
