(function() {
  var banner, brunch, colors, fs, globalOpts, helpers, options, parser, path, usage, version, yaml, _;
  parser = require('nomnom');
  path = require('path');
  brunch = require('./brunch');
  helpers = require('./helpers');
  colors = require('../vendor/termcolors').colors;
  yaml = require('yaml');
  fs = require('fs');
  _ = require('underscore');
  globalOpts = {
    version: {
      abbr: 'v',
      help: 'display brunch version',
      callback: function() {
        return version();
      }
    },
    output: {
      abbr: 'o',
      help: 'set build path',
      expectsValue: true,
      metavar: "DIRECTORY"
    },
    minify: {
      abbr: 'm',
      help: 'minify the app.js output via UglifyJS'
    }
  };
  banner = 'http://brunchwithcoffee.com\n\nUsage: brunch [command] [options]\n\nPossible commands are:\n  new [<path>]    create new brunch project\n  build [<path>]  build project\n  watch [<path>]  watch brunch directory and rebuild if something changed';
  options = {};
  exports.run = function() {
    options = exports.loadDefaultArguments();
    parser.globalOpts(globalOpts);
    parser.scriptName('brunch <command> [<path>]');
    parser.printFunc(usage);
    parser.command('new').callback(function(opts) {
      options = exports.loadOptionsFromArguments(opts, options);
      return brunch["new"](options, function() {
        var configPath;
        configPath = exports.generateConfigPath(opts[1]);
        options = _.extend(options, exports.loadConfigFile(configPath));
        options = exports.loadOptionsFromArguments(opts, options);
        return brunch.build(options);
      });
    }).help('Create new brunch project');
    parser.command('build').callback(function(opts) {
      var configPath;
      configPath = exports.generateConfigPath(opts[1]);
      options = _.extend(options, exports.loadConfigFile(configPath));
      options = exports.loadOptionsFromArguments(opts, options);
      return brunch.build(options);
    }).help('Build a brunch project');
    parser.command('watch').callback(function(opts) {
      var configPath;
      configPath = exports.generateConfigPath(opts[1]);
      options = _.extend(options, exports.loadConfigFile(configPath));
      options = exports.loadOptionsFromArguments(opts, options);
      return brunch.watch(options);
    }).help('Watch brunch directory and rebuild if something changed');
    return parser.parseArgs();
  };
  exports.generateConfigPath = function(appPath) {
    if (appPath != null) {
      return path.join(appPath, 'config.yaml');
    } else {
      return 'brunch/config.yaml';
    }
  };
  exports.loadDefaultArguments = function() {
    options = {
      templateExtension: 'eco',
      brunchPath: 'brunch',
      dependencies: [],
      minify: false
    };
    return options;
  };
  exports.loadConfigFile = function(configPath) {
    try {
      options = yaml.eval(fs.readFileSync(configPath, 'utf8'));
      return options;
    } catch (e) {
      helpers.log(colors.lred("brunch:   Couldn't find config.yaml file\n", true));
      return process.exit(0);
    }
  };
  exports.loadOptionsFromArguments = function(opts, options) {
    if (opts.templateExtension != null) {
      options.templateExtension = opts.templateExtension;
    }
    if (opts[1] != null) {
      options.brunchPath = opts[1];
    }
    if (opts.minify != null) {
      options.minify = opts.minify;
    }
    if (opts.output != null) {
      options.buildPath = opts.output;
    } else if (options.buildPath == null) {
      options.buildPath = path.join(options.brunchPath, 'build');
    }
    return options;
  };
  usage = function() {
    process.stdout.write(banner);
    process.stdout.write(helpers.optionsInfo(globalOpts));
    return process.exit(0);
  };
  version = function() {
    process.stdout.write("brunch version " + brunch.VERSION + "\n");
    return process.exit(0);
  };
}).call(this);
