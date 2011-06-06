(function() {
  var BANNER, NOMNOM_CONFIG, argParser, brunch, colors, fs, helpers, nomnom, options, parseOptions, path, usage, version, yaml, _;
  nomnom = require('nomnom');
  path = require('path');
  brunch = require('./brunch');
  helpers = require('./helpers');
  colors = require('../vendor/termcolors').colors;
  yaml = require('yaml');
  fs = require('fs');
  _ = require('underscore');
  NOMNOM_CONFIG = [
    {
      name: 'expressPort',
      string: '-ep <port>, --expressPort=<port>',
      help: 'set the express server port'
    }, {
      name: 'projectTemplate',
      string: '-p <template>, --projectTemplate=<template>',
      help: 'set which kind of project template should be used'
    }, {
      name: 'version',
      string: '-v, --version',
      help: 'display brunch version'
    }, {
      name: 'help',
      string: '-h, --help',
      help: 'display brunch help'
    }, {
      name: 'output',
      string: '-o, --output',
      help: 'set build path'
    }, {
      name: 'minify',
      string: '-m, --minify',
      help: 'minify the app.js output via UglifyJS'
    }
  ];
  BANNER = 'Usage: brunch [command] [options]\n\nPossible commands are:\n  new [<path>]    create new brunch project\n  build [<path>]  build project\n  watch [<path>]  watch brunch directory and rebuild if something changed';
  options = {};
  argParser = {};
  exports.run = function() {
    var command, configPath, opts;
    opts = parseOptions();
    if (opts.help) {
      return usage();
    }
    if (opts.version) {
      return version();
    }
    helpers.log("brunch:   " + (colors.lblue('Backwards Incompatible Changes since 0.7.0', true)) + "\n\n                     please visit http://brunchwithcoffee.com/#migrate-to-0-7-0-plus for more information \n\n");
    options = exports.loadDefaultArguments();
    command = opts[0];
    configPath = opts[1] != null ? path.join(opts[1], 'config.yaml') : 'brunch/config.yaml';
    if (command === "new") {
      options = exports.loadOptionsFromArguments(opts, options);
      return brunch["new"](options, function() {
        options = _.extend(options, exports.loadConfigFile(configPath));
        options = exports.loadOptionsFromArguments(opts, options);
        return brunch.build(options);
      });
    } else if (command === 'watch' || command === 'build') {
      options = _.extend(options, exports.loadConfigFile(configPath));
      options = exports.loadOptionsFromArguments(opts, options);
      if (command === "watch") {
        return brunch.watch(options);
      } else if (command === "build") {
        return brunch.build(options);
      }
    } else {
      return usage();
    }
  };
  exports.loadDefaultArguments = function() {
    options = {
      templateExtension: 'eco',
      projectTemplate: 'express',
      expressPort: '8080',
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
    if (opts.projectTemplate != null) {
      options.projectTemplate = opts.projectTemplate;
    }
    if (opts.expressPort != null) {
      options.expressPort = opts.expressPort;
    }
    if (opts[1] != null) {
      options.brunchPath = opts[1];
    }
    if (opts.minify != null) {
      options.minify = opts.minify;
    }
    if (opts.buildPath != null) {
      options.buildPath = opts.buildPath;
    } else if (options.buildPath == null) {
      options.buildPath = path.join(options.brunchPath, 'build');
    }
    return options;
  };
  parseOptions = function() {
    return nomnom.parseArgs(NOMNOM_CONFIG, {
      printHelp: false
    });
  };
  usage = function() {
    process.stdout.write(BANNER);
    process.stdout.write(helpers.optionsInfo(NOMNOM_CONFIG));
    return process.exit(0);
  };
  version = function() {
    process.stdout.write("brunch version " + brunch.VERSION + "\n");
    return process.exit(0);
  };
}).call(this);
