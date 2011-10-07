fs = require "fs"


# extract package information
package = JSON.parse fs.readFileSync __dirname + "/../package.json"
exports.version = package.version
