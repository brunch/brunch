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
      this._changed_files || (this._changed_files = []);
      this._changed_files.push(file);
      clearTimeout(this._timeout);
      return this._timeout = setTimeout(__bind(function() {
        _.bind(this.compile, this, this._changed_files)();
        return this._changed_files = null;
      }, this), 20);
    };
    return Compiler;
  })();
  exports.StitchCompiler = require('./stitch').StitchCompiler;
  exports.StylusCompiler = require('./stylus').StylusCompiler;
}).call(this);
