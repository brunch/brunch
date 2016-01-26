'use strict';

var version = process.version;
var verDigit = parseInt(version.match(/^v(\d+)\./)[1]);

if (verDigit < 4) {
  console.error(
    'Your global Brunch installation is trying to load local Brunch 2+, ' +
    'which only supports node.js v4 or higher (you have ' + version + ').\n' +
    'You have two choices:\n' +
    '  a) Update node.js to v4+. Then update global Brunch: ' +
    '`npm un -g brunch && npm i -g brunch`\n' +
    '  b) Adjust package.json to use brunch 1.x (outdated, not recommended).'
  );
  process.exit();
}

// The file uses ES2015, which cannot be used with old Brunches.
exports.run = require('./commands').run;
