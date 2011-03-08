(function() {
  var BANNER, NOMNOM_CONFIG, argParser, brunch, fs, helpers, nomnom, options, parseOptions, usage, util, version, yaml;
  fs = require('fs');
  util = require('util');
  yaml = require('yaml');
  nomnom = require('nomnom');
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
      name: 'noDocco',
      string: '-nd, --no-docco',
      help: 'without docco'
    }
  ];
  BANNER = 'Usage: brunch [command] [options]\n\nPossible commands are:\n  new           create new brunch project\n  build         build project\n  watch         watch brunch directory and rebuild if something changed';
  options = {};
  argParser = {};
  exports.run = function() {
    var command, name, opts;
    opts = parseOptions();
    if (opts.help) {
      return usage();
    }
    if (opts.version) {
      return version();
    }
    options.templateExtension = "eco";
    options.projectTemplate = "express";
    options.expressPort = "8080";
    options.noDocco = false;
    options = exports.loadOptionsFromArguments(opts, options);
    command = opts[0];
    if (command === "new") {
      name = opts[1] || "app";
      return brunch["new"](name, options, function() {
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
  exports.loadOptionsFromArguments = function(opts, options) {
    if (opts.templateExtension) {
      options.templateExtension = opts.templateExtension;
    }
    if (opts.projectTemplate) {
      options.projectTemplate = opts.projectTemplate;
    }
    if (opts.expressPort) {
      options.expressPort = opts.expressPort;
    }
    if (opts.noDocco) {
      options.noDocco = opts.noDocco;
    }
    helpers.log(options.expressPort);
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
