(function() {
  var fileUtil, fs, helpers, path, _;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  _ = require("underscore");
  path = require("path");
  fs = require("fs");
  fileUtil = require("file");
  helpers = require("../helpers");
  exports.Compiler = (function() {
    function Compiler(rootPath, options) {
      this.rootPath = rootPath;
      this.options = options;
      null;
    }
    Compiler.prototype.getPath = function(subPath) {
      return path.join(this.options.rootPath, subPath);
    };
    Compiler.prototype.getBuildPath = function(subPath) {
      return path.join(this.options.buildPath, subPath);
    };
    Compiler.prototype.getClassName = function() {
      var name;
      name = this.constructor.name.replace("Compiler", "");
      return "[" + name + "]:";
    };
    Compiler.prototype.patterns = function() {
      return this.options.filePattern;
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
    Compiler.prototype.compile = function(files) {
      return null;
    };
    Compiler.prototype.generatePath = function(dirPath) {
      return path.resolve(this.rootPath, dirPath);
    };
    Compiler.prototype.writeToFile = function(filePath, content, callback) {
      var dirPath;
      filePath = this.generatePath(filePath);
      dirPath = path.dirname(filePath);
      return fileUtil.mkdirs(dirPath, 0755, __bind(function(error) {
        if (error != null) {
          this.logError("couldn't create build path.");
          if (callback != null) {
            return callback(error);
          }
        } else {
          return fs.writeFile(filePath, content, __bind(function(error) {
            if (error != null) {
              this.logError("couldn't write compiled file. " + error);
            }
            if (callback != null) {
              return callback(error);
            }
          }, this));
        }
      }, this));
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
