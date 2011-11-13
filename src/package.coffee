fs = require 'fs'
path = require 'path'


package = JSON.parse fs.readFileSync path.join __dirname, '..', 'package.json'
exports.version = package.version
