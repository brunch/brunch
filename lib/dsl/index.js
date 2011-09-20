(function() {
  var DSL, PathMatcher, YamlConfig, conf, dsl, helpers;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __slice = Array.prototype.slice;
  conf = require("coffee-conf");
  helpers = require("../helpers");
  PathMatcher = require("./path_matcher").PathMatcher;
  YamlConfig = require("./yaml_config").YamlConfig;
  DSL = (function() {
    __extends(DSL, conf.Config);
    function DSL() {
      var context, locals;
      this._buildPath = "build";
      this.matchers = [];
      context = {};
      locals = {
        files: __bind(function() {
          return this.files.apply(this, arguments);
        }, this),
        buildPath: __bind(function() {
          return this.buildPath.apply(this, arguments);
        }, this)
      };
      DSL.__super__.constructor.call(this, locals, context);
    }
    DSL.prototype.files = function() {
      var matcher, paths;
      paths = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      matcher = new PathMatcher(this, paths);
      this.matchers.push(matcher);
      return matcher;
    };
    DSL.prototype.run = function(code) {
      var matcher, options, _i, _len, _ref;
      DSL.__super__.run.call(this, code);
      options = {};
      _ref = this.matchers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        matcher = _ref[_i];
        if (matcher.name == null) {
          next;
        }
        options[matcher.name] = matcher.options;
      }
      return options;
    };
    DSL.prototype.buildPath = function(path) {
      this._buildPath = path;
      return this;
    };
    return DSL;
  })();
  dsl = new DSL;
  exports.matchers = dsl.matchers;
  exports.run = function() {
    return dsl.run.apply(dsl, arguments);
  };
  exports.loadConfigFile = function() {
    return dsl.runFile.apply(dsl, arguments);
  };
  exports.loadYamlConfigFile = function(path, options) {
    var yaml;
    helpers.logError("Old yaml based config file found! Please switch to new coffee-script based configuration!");
    yaml = new YamlConfig(path, options);
    return yaml.toOptions();
  };
}).call(this);
