(function() {
  exports.package = JSON.parse(require("fs").readFileSync(__dirname + "/../package.json"));
  exports.version = exports.package.version;
}).call(this);
