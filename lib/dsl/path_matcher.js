(function() {
  var path, _;
  _ = require("underscore");
  path = require("path");
  exports.PathMatcher = (function() {
    function PathMatcher(dsl, filePattern) {
      this.dsl = dsl;
      this.options = {
        filePattern: _.flatten([filePattern])
      };
    }
    PathMatcher.prototype.use = function(compiler, options) {
      if (options == null) {
        options = {};
      }
      this.name = compiler;
      _.extend(this.options, options);
      return this;
    };
    PathMatcher.prototype.output = function(filePath) {
      return this.options.output = filePath[0] === '/' ? filePath : path.join(this.dsl._buildPath, filePath);
    };
    return PathMatcher;
  })();
}).call(this);
