(function() {
  var BANNER, SWITCHES, brunch, fs, options, optparse, parseOptions, usage, version, yaml;
  fs = require('fs');
  yaml = require('yaml');
  brunch = require('./brunch');
  optparse = require('./optparse');
  SWITCHES = [['-v', '--version', 'display brunch version'], ['-h', '--help', 'display this help message'], ['-p', '--projectTemplate [type]', 'set which kind of project template should be used']];
  BANNER = 'Usage: brunch [options] [command]\n\nPossible commands are:\n  new           create new brunch project\n  build         build project\n  watch         watch brunch directory and rebuild if something changed';
  options = {};
  exports.run = function() {
    var command, opts;
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
    command = opts.arguments[0];
    if (command === "new") {
      if (!opts.arguments[1]) {
        return usage();
      }
      brunch.newProject(opts.arguments[1], options);
      return brunch.build(options);
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
    var optionParser;
    optionParser = new optparse.OptionParser(SWITCHES, BANNER);
    return optionParser.parse(process.argv.slice(2));
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
