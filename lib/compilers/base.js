(function() {
  var helpers, path, _;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  path = require("path");
  _ = require("underscore");
  helpers = require("../helpers");
  exports.Compiler = (function() {
    function Compiler(options) {
      this.options = options;
      null;
    }
    Compiler.prototype.getPath = function(subPath) {
      return path.join(this.options.brunchPath, subPath);
    };
    Compiler.prototype.getBuildPath = function(subPath) {
      return path.join(this.options.buildPath, subPath);
    };
    Compiler.prototype.patterns = function() {
      return [];
    };
    Compiler.prototype.compile = function(files) {
      return null;
    };
    Compiler.prototype.fileChanged = function(file) {
      var _ref;
      if ((_ref = this.changedFiles) == null) {
        this.changedFiles = [];
      }
      this.changedFiles.push(file);
      clearTimeout(this.timeout);
      return this.timeout = setTimeout(__bind(function() {
        _.bind(this.compile, this, this.changedFiles)();
        return this.changedFiles = void 0;
      }, this), 20);
    };
    Compiler.prototype.matchesFile = function(file) {
      return _.any(this.patterns(), function(pt) {
        return file.match(pt);
      });
    };
    return Compiler;
  })();
}).call(this);
