'use strict';
const sysPath = require('path');

const isRelative = path => path.slice(0, 2) === './' || path.slice(0, 3) === '../';
const makeRelative = path => path.replace(process.cwd() + sysPath.sep, '');
const not = f => i => !f(i);

module.exports = {makeRelative, isRelative, not};
