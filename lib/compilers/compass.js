(function() {
  var Compiler, colors, exec, fs, helpers, path;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  fs = require('fs');
  path = require('path');
  helpers = require('../helpers');
  colors = require('../../vendor/termcolors').colors;
  exec = require('child_process').exec;
  Compiler = require('./base').Compiler;
  exports.CompassCompiler = (function() {
    __extends(CompassCompiler, Compiler);
    function CompassCompiler() {
      CompassCompiler.__super__.constructor.apply(this, arguments);
    }
    CompassCompiler.prototype.filePattern = function() {
      return [/\.sass|.scss$/];
    };
    CompassCompiler.prototype.compile = function(files) {
      var compassOpts;
      compassOpts = ["--output-style compressed", "--sass-dir " + (path.join(this.options.brunchPath, 'src/app/styles')), "--css-dir " + (path.join(this.options.brunchPath, 'build/web/css')), "--images-dir " + (path.join(this.options.brunchPath, 'build/web/img')), "--javascripts-dir " + (path.join(this.options.brunchPath, 'build/web/js'))].join(" ");
      return exec("compass compile " + compassOpts, function(err, stdout) {
        if (err != null) {
          return helpers.log(colors.lred('compass err: ' + stdout));
        } else {
          return helpers.log(colors.green(stdout));
        }
      });
    };
    return CompassCompiler;
  })();
}).call(this);
