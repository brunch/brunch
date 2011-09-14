(function() {
  var fs, package;
  fs = require("fs");
  package = JSON.parse(fs.readFileSync(__dirname + "/../package.json"));
  exports.version = package.version;
}).call(this);
