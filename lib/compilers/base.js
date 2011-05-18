(function() {
  var helpers, _;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  _ = require('underscore');
  helpers = require('../helpers');
  exports.Compiler = (function() {
    function Compiler(options) {
      this.options = options;
    }
    Compiler.prototype.filePattern = function() {
      return [];
    };
    Compiler.prototype.matchesFile = function(file) {
      return _.any(this.filePattern(), function(pattern) {
        return file.match(pattern);
      });
    };
    Compiler.prototype.compile = function(files) {};
    Compiler.prototype.fileChanged = function(file) {
      this.changedFiles || (this.changedFiles = []);
      this.changedFiles.push(file);
      clearTimeout(this.timeout);
      return this.timeout = setTimeout(__bind(function() {
        _.bind(this.compile, this, this.changedFiles)();
        return this.changedFiles = null;
      }, this), 20);
    };
    return Compiler;
  })();
}).call(this);
