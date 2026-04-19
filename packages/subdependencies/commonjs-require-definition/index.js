'use strict';
const readFile = require('fs').readFileSync;
const join = require('path').join;

module.exports = readFile(join(__dirname, 'require.js'), 'utf8');
