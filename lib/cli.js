'use strict';

var version = parseInt(process.version.match(/^v(\d+)\./)[1]);

if (version < 4) {
  return console.error(
    'Error: Brunch 2+ requires node v4.0+. ' +
    'Upgrade node or use older Brunch v1 for old node.js: npm i brunch@1'
  );
}

// The file uses ES2015, which cannot be used with old Brunches.
exports.run = require('./commands').run;
