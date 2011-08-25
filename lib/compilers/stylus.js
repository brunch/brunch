(function() {
  var Compiler, colors, fs, helpers, nib, path, stylus;
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
  try {
    nib = require('nib')();
  } catch (error) {
    false;
  }
  exports.StylusCompiler = (function() {
    __extends(StylusCompiler, Compiler);
    function StylusCompiler() {
      StylusCompiler.__super__.constructor.apply(this, arguments);
    }
    StylusCompiler.prototype.filePattern = function() {
      return [/\.styl$/];
    };
    StylusCompiler.prototype.compile = function(files) {
      var mainFilePath;
      mainFilePath = path.join(this.options.brunchPath, 'src/app/styles/main.styl');
      return path.exists(mainFilePath, function(stylusFound) {
        if (stylusFound) {
          return fs.readFile(mainFilePath, 'utf8', __bind(function(err, data) {
            var compiler;
            if (err != null) {
              return helpers.log(colors.lred('stylus err: ' + err));
            } else {
              compiler = stylus(data).set('filename', mainFilePath).set('compress', true).include(path.join(this.options.brunchPath, 'src'));
              if (nib) {
                compiler.use(nib);
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
        }
      });
    };
    return StylusCompiler;
  })();
}).call(this);
