fs = require 'fs'

# extract package information
exports.packageInformation = JSON.parse fs.readFileSync(__dirname + "/../package.json")
