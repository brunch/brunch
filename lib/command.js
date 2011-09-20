(function() {
  var banner, brunch, dsl, fs, globalOpts, helpers, options, parser, path, usage, version, _;
  parser = require("nomnom");
  path = require("path");
  fs = require("fs");
  _ = require("underscore");
  brunch = require("./brunch");
  dsl = require('./dsl');
  helpers = require("./helpers");
  globalOpts = {
    version: {
      abbr: "v",
      flag: true,
      help: "display brunch version",
      callback: function() {
        return version();
      }
    },
    output: {
      abbr: "o",
      help: "set build path",
      metavar: "DIRECTORY"
    },
    minify: {
      abbr: "m",
      flag: true,
      help: "minify the app.js output via UglifyJS"
    }
  };
  banner = "http://brunchwithcoffee.com\n\nUsage: brunch [command] [options]\n\nPossible commands are:\n  new [<path>]    create new brunch project\n  build [<path>]  build project\n  watch [<path>]  watch brunch directory and rebuild if something changed";
  options = {};
  exports.run = function() {
    parser.globalOpts(globalOpts);
    parser.scriptName("brunch <command> [<path>]");
    parser.printFunc(usage);
    parser.command("new").callback(function(opts) {
      var rootPath;
      rootPath = exports.generateRootPath(opts[1]);
      return brunch["new"](rootPath, function() {
        options = exports.loadConfigFile(rootPath);
        return brunch.build(rootPath, options);
      });
    }).help("Create new brunch project");
    parser.command("build").callback(function(opts) {
      var rootPath;
      rootPath = exports.generateRootPath(opts[1]);
      options = exports.loadConfigFile(rootPath);
      return brunch.build(rootPath, options);
    }).help("Build a brunch project");
    parser.command("watch").callback(function(opts) {
      var rootPath;
      rootPath = exports.generateRootPath(opts[1]);
      options = exports.loadConfigFile(rootPath);
      return brunch.watch(rootPath, options);
    }).help("Watch brunch directory and rebuild if something changed");
    parser.parseArgs();
    if (!process.argv[2]) {
      return usage();
    }
  };
  exports.generateRootPath = function(appPath) {
    if (appPath != null) {
      return appPath;
    } else {
      return 'brunch/';
    }
  };
  exports.loadConfigFile = function(rootPath) {
    var coffee_config, yaml_config;
    options = {};
    coffee_config = path.join(rootPath, 'config.coffee');
    yaml_config = path.join(rootPath, 'config.yaml');
    if (path.existsSync(coffee_config)) {
      options = dsl.loadConfigFile(coffee_config, options);
    } else if (path.existsSync(yaml_config)) {
      options = dsl.loadYamlConfigFile(yaml_config, options);
    } else {
      helpers.logError("[Brunch]: couldn't find config file");
      helpers.exit();
    }
    return options;
  };
  usage = function() {
    process.stdout.write(banner);
    process.stdout.write(helpers.optionsInfo(globalOpts));
    return helpers.exit();
  };
  version = function() {
    process.stdout.write("brunch version " + brunch.VERSION + "\n");
    return helpers.exit();
  };
}).call(this);
