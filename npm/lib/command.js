(function() {
  var BANNER, NOMNOM_CONFIG, SWITCHES, brunch, fs, nomnom, options, optparse, parseOptions, usage, version, yaml;
  fs = require('fs');
  yaml = require('yaml');
  nomnom = require('nomnom');
  brunch = require('./brunch');
  optparse = require('./optparse');
  SWITCHES = [['-v', '--version', 'display brunch version'], ['-h', '--help', 'display this help message'], ['-p', '--projectTemplate=[type]', 'set which kind of project template should be used']];
  NOMNOM_CONFIG = [
    {
      "name": 'projectTemplate',
      "string": '-p TEMPLATE, --projectTemplate=TEMPLATE',
      "default": 'express',
      "help": 'set which kind of project template should be used'
    }, {
      "name": 'version',
      "string": '-v, --version',
      "help": 'display brunch version'
    }, {
      "name": 'help',
      "string": '-h, --help',
      "help": 'display brunch help'
    }
  ];
  BANNER = 'Usage: brunch [command] [options]\n\nPossible commands are:\n  new           create new brunch project\n  build         build project\n  watch         watch brunch directory and rebuild if something changed';
  options = {};
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
    options = exports.loadOptionsFromArguments(opts, options);
    command = opts[0];
    if (command === "new") {
      name = opts[1] || "app";
      return brunch.newProject(name, options);
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
    return options;
  };
  parseOptions = function() {
    return nomnom.parseArgs(NOMNOM_CONFIG, {
      printHelp: false
    });
  };
  usage = function() {
    process.stdout.write((new optparse.OptionParser(SWITCHES, BANNER)).help());
    return process.exit(0);
  };
  version = function() {
    process.stdout.write("brunch version " + brunch.VERSION + "\n");
    return process.exit(0);
  };
}).call(this);
