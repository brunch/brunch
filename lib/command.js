(function() {
  var BANNER, NOMNOM_CONFIG, argParser, brunch, helpers, nomnom, options, parseOptions, path, usage, version;
  nomnom = require('nomnom');
  path = require('path');
  brunch = require('./brunch');
  helpers = require('./helpers');
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
    }
  ];
  BANNER = 'Usage: brunch [command] [options]\n\nPossible commands are:\n  new           create new brunch project\n  build         build project\n  watch         watch brunch directory and rebuild if something changed';
  options = {};
  argParser = {};
  exports.run = function() {
    var command, opts;
    opts = parseOptions();
    if (opts.help) {
      return usage();
    }
    if (opts.version) {
      return version();
    }
    options = exports.loadDefaultArguments();
    options = exports.loadOptionsFromArguments(opts, options);
    command = opts[0];
    if (command === "new") {
      return brunch["new"](options, function() {
        return brunch.build(options);
      });
    } else if (command === "watch") {
      return brunch.watch(options);
    } else if (command === "build") {
      return brunch.build(options);
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
      buildPath: 'brunch/build'
    };
    return options;
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
    if (opts.buildPath != null) {
      options.buildPath = opts.buildPath;
    } else {
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
