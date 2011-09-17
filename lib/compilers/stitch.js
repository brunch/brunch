(function() {
  var Compiler, fs, helpers, path, stitch, uglify, _;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  fs = require("fs");
  path = require("path");
  stitch = require("stitch");
  uglify = require("uglify-js");
  _ = require("underscore");
  helpers = require("../helpers");
  Compiler = require("./base").Compiler;
  exports.StitchCompiler = (function() {
    __extends(StitchCompiler, Compiler);
    function StitchCompiler(options) {
      StitchCompiler.__super__.constructor.apply(this, arguments);
      this.vendorPath = this.getPath("src/vendor");
    }
    StitchCompiler.prototype.patterns = function() {
      return [/\.coffee$/, /src\/.*\.js$/, new RegExp("" + this.options.templateExtension + "$")];
    };
    StitchCompiler.prototype.package = function() {
      var _ref;
      return (_ref = this._package) != null ? _ref : this._package = stitch.createPackage({
        dependencies: this.collectDependencies(),
        paths: [this.getPath("src/app/")]
      });
    };
    StitchCompiler.prototype.collectDependencies = function() {
      var additionalLibaries, args, dependencies, filenames;
      filenames = helpers.filterFiles(fs.readdirSync(this.vendorPath), this.vendorPath);
      args = this.options.dependencies.slice();
      args.unshift(filenames);
      additionalLibaries = _.without.apply(this, args);
      dependencies = this.options.dependencies.concat(additionalLibaries);
      return dependencies.map(__bind(function(filename) {
        return path.join(this.vendorPath, filename);
      }, this));
    };
    StitchCompiler.prototype.minify = function(source) {
      var ast_mangle, ast_squeeze, gen_code, parse, _ref;
      parse = uglify.parser.parse;
      _ref = uglify.uglify, ast_mangle = _ref.ast_mangle, ast_squeeze = _ref.ast_squeeze, gen_code = _ref.gen_code;
      helpers.logSuccess("[Uglify]: minified");
      return gen_code(ast_squeeze(ast_mangle(parse(source))));
    };
    StitchCompiler.prototype.compile = function(files) {
      if (_.any(files, (function(file) {
        return file.match(/src\/vendor\//);
      }))) {
        this.package().dependencies = this.collectDependencies();
      }
      return this.package().compile(__bind(function(err, source) {
        var outPath;
        if (err != null) {
          return helpers.logError("[Brunch]: Error during compilation: " + err);
        } else {
          helpers.logSuccess("[Stitch]: compiled");
          if (this.options.minify) {
            source = this.minify(source);
          }
          outPath = this.getBuildPath("web/js/app.js");
          return fs.writeFile(outPath, source, __bind(function(err) {
            if (err != null) {
              return helpers.logError("[Brunch]: Couldn't write compiled file " + err);
            }
          }, this));
        }
      }, this));
    };
    return StitchCompiler;
  })();
}).call(this);
