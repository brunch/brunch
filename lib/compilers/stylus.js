(function() {
  var Compiler, colors, fs, helpers, path, stylus;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  fs = require('fs');
  path = require('path');
  helpers = require('../helpers');
  colors = require('../../vendor/termcolors').colors;
  stylus = require('stylus');
  Compiler = require('./base').Compiler;
  exports.StylusCompiler = (function() {
    __extends(StylusCompiler, Compiler);
    function StylusCompiler() {
      StylusCompiler.__super__.constructor.apply(this, arguments);
    }
    StylusCompiler.prototype.filePattern = function() {
      return [/\.styl$/];
    };
    StylusCompiler.prototype.compile = function(files) {
      var main_file_path;
      main_file_path = path.join(this.options.brunchPath, 'src/app/styles/main.styl');
      return fs.readFile(main_file_path, 'utf8', __bind(function(err, data) {
        var compiler;
        if (err != null) {
          return helpers.log(colors.lred('stylus err: ' + err));
        } else {
          compiler = stylus(data).set('filename', main_file_path).set('compress', true).include(path.join(this.options.brunchPath, 'src'));
          if (this.nib()) {
            compiler.use(this.nib());
          }
          return compiler.render(__bind(function(err, css) {
            if (err != null) {
              return helpers.log(colors.lred('stylus err: ' + err));
            } else {
              return fs.writeFile(path.join(this.options.buildPath, 'web/css/main.css'), css, 'utf8', __bind(function(err) {
                if (err != null) {
                  return helpers.log(colors.lred('stylus err: ' + err));
                } else {
                  return helpers.log("stylus:   " + (colors.green('compiled', true)) + " main.css\n");
                }
              }, this));
            }
          }, this));
        }
      }, this));
    };
    StylusCompiler.prototype.nib = function() {
      return this._nib || (this._nib = (function() {
        try {
          if (require('nib')) {
            return require('nib')();
          } else {
            return false;
          }
        } catch (error) {
          return false;
        }
      })());
    };
    return StylusCompiler;
  })();
}).call(this);
