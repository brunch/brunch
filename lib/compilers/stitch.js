(function() {
  var Compiler, colors, fs, helpers, options, path, stitch, _;
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
  stitch = require('stitch');
  _ = require('underscore');
  options = require('../brunch').options;
  Compiler = require('./index').Compiler;
  exports.StitchCompiler = (function() {
    __extends(StitchCompiler, Compiler);
    function StitchCompiler() {
      StitchCompiler.__super__.constructor.apply(this, arguments);
    }
    StitchCompiler.prototype.filePattern = function() {
      return [/\.coffee$/, /src\/.*\.js$/, new RegExp("" + options.templateExtension + "$")];
    };
    StitchCompiler.prototype.compile = function(files) {
      if (_.any(files, function(file) {
        return file.match(/src\/vendor\//);
      })) {
        this.package().dependencies = this.collectDependencies();
      }
      return this.package().compile(__bind(function(err, source) {
        if (err != null) {
          helpers.log("brunch:   " + (colors.lred('There was a problem during compilation.', true)) + "\n");
          return helpers.log("" + (colors.lgray(err, true)) + "\n");
        } else {
          return fs.writeFile(path.join(options.buildPath, 'web/js/app.js'), source, __bind(function(err) {
            if (err != null) {
              helpers.log("brunch:   " + (colors.lred('Couldn\'t write compiled file.', true)) + "\n");
              return helpers.log("" + (colors.lgray(err, true)) + "\n");
            } else {
              return helpers.log("stitch:   " + (colors.green('compiled', true)) + " application\n");
            }
          }, this));
        }
      }, this));
    };
    StitchCompiler.prototype.package = function() {
      return this._package || (this._package = stitch.createPackage({
        dependencies: this.collectDependencies(),
        paths: [path.join(options.brunchPath, 'src/app/')]
      }));
    };
    StitchCompiler.prototype.collectDependencies = function() {
      var additionalLibaries, args, dependencies, filenames;
      filenames = fs.readdirSync(this.vendorPath());
      filenames = helpers.filterFiles(filenames, this.vendorPath());
      args = options.dependencies.slice();
      args.unshift(filenames);
      additionalLibaries = _.without.apply(this, args);
      dependencies = options.dependencies.concat(additionalLibaries);
      return _.map(dependencies, __bind(function(filename) {
        return path.join(this.vendorPath(), filename);
      }, this));
    };
    StitchCompiler.prototype.vendorPath = function() {
      return this._vendor_path || (this._vendor_path = path.join(options.brunchPath, 'src/vendor'));
    };
    return StitchCompiler;
  })();
}).call(this);
