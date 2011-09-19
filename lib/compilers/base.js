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
    Compiler.prototype.getClassName = function() {
      var name;
      name = this.constructor.name.replace("Compiler", "");
      return "[" + name + "]:";
    };
    Compiler.prototype.log = function(text) {
      if (text == null) {
        text = "OK";
      }
      return helpers.logSuccess("" + (this.getClassName()) + " " + text + ".");
    };
    Compiler.prototype.logError = function(text) {
      return helpers.logError("" + (this.getClassName()) + " error. " + text);
    };
    Compiler.prototype.patterns = function() {
      return [];
    };
    Compiler.prototype.compile = function(files) {
      return null;
    };
    Compiler.prototype.clearQueue = function() {
      _.bind(this.compile, this, this.changedFiles)();
      return this.changedFiles = [];
    };
    Compiler.prototype.addToQueue = function(file) {
      var _ref;
      if ((_ref = this.changedFiles) == null) {
        this.changedFiles = [];
      }
      return this.changedFiles.push(file);
    };
    Compiler.prototype.onFileChanged = function(file) {
      this.addToQueue(file);
      if (this.timeout != null) {
        clearTimeout(this.timeout);
      }
      return this.timeout = setTimeout((__bind(function() {
        return this.clearQueue();
      }, this)), 20);
    };
    Compiler.prototype.matchesFile = function(file) {
      return _.any(this.patterns(), function(pt) {
        return file.match(pt);
      });
    };
    return Compiler;
  })();
}).call(this);
