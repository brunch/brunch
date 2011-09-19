(function() {
  var Compiler, fs, nib, stylus;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  fs = require("fs");
  stylus = require("stylus");
  Compiler = require("./base").Compiler;
  try {
    nib = require("nib")();
  } catch (error) {
    null;
  }
  exports.StylusCompiler = (function() {
    __extends(StylusCompiler, Compiler);
    function StylusCompiler() {
      StylusCompiler.__super__.constructor.apply(this, arguments);
    }
    StylusCompiler.prototype.patterns = function() {
      return [/\.styl$/];
    };
    StylusCompiler.prototype.compile = function(files) {
      var mainFilePath;
      mainFilePath = this.getPath("src/app/styles/main.styl");
      return fs.readFile(mainFilePath, "utf8", __bind(function(error, data) {
        var compiler;
        if (error != null) {
          return this.logError(error);
        }
        compiler = stylus(data).set("filename", mainFilePath).set("compress", true).include(this.getPath("src"));
        if (nib) {
          compiler.use(nib);
        }
        return compiler.render(__bind(function(error, css) {
          var main;
          if (error != null) {
            return this.logError(error);
          }
          main = this.getBuildPath("web/css/main.css");
          return fs.writeFile(main, css, "utf8", __bind(function(error) {
            if (error != null) {
              return this.logError(error);
            }
            return this.log();
          }, this));
        }, this));
      }, this));
    };
    return StylusCompiler;
  })();
}).call(this);
