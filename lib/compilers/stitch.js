(function() {
  var Compiler, brunch, fs, helpers, path, stitch, uglify, _;
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
  brunch = require("../brunch");
  helpers = require("../helpers");
  Compiler = require("./base").Compiler;
  exports.StitchCompiler = (function() {
    __extends(StitchCompiler, Compiler);
    function StitchCompiler(rootPath, options) {
      StitchCompiler.__super__.constructor.apply(this, arguments);
      this.vendorPath = "src/vendor/";
    }
    StitchCompiler.prototype.package = function() {
      var _ref;
      return (_ref = this._package) != null ? _ref : this._package = stitch.createPackage({
        dependencies: this.collectDependencies(),
        paths: [this.generatePath('src/app/')]
      });
    };
    StitchCompiler.prototype.collectDependencies = function() {
      var additionalLibaries, args, dependencies, filenames;
      filenames = helpers.filterFiles(fs.readdirSync(this.generatePath(this.vendorPath)), this.generatePath(this.vendorPath));
      args = this.options.dependencies.slice();
      args.unshift(filenames);
      additionalLibaries = _.without.apply(this, args);
      dependencies = this.options.dependencies.concat(additionalLibaries);
      return _.map(dependencies, __bind(function(filename) {
        return this.generatePath(path.join(this.vendorPath, filename));
      }, this));
    };
    StitchCompiler.prototype.minify = function(source) {
      var ast_mangle, ast_squeeze, gen_code, parse, _ref;
      parse = uglify.parser.parse;
      _ref = uglify.uglify, ast_mangle = _ref.ast_mangle, ast_squeeze = _ref.ast_squeeze, gen_code = _ref.gen_code;
      this.log("minified");
      return gen_code(ast_squeeze(ast_mangle(parse(source))));
    };
    StitchCompiler.prototype.compile = function(files) {
      if (_.any(files, (function(file) {
        return file.match(/src\/vendor\//);
      }))) {
        this.package().dependencies = this.collectDependencies();
      }
      return this.package().compile(__bind(function(error, source) {
        if (error != null) {
          return this.logError(error);
        }
        this.log("compiled");
        if (this.options.minify) {
          source = this.minify(source);
        }
        return this.writeToFile(this.options.output, source);
      }, this));
    };
    return StitchCompiler;
  })();
}).call(this);
