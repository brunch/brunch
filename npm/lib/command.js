(function() {
  var BANNER, SWITCHES, brunch, fs, options, optparse, parseOptions, usage, version, yaml;
  fs = require('fs');
  yaml = require('yaml');
  brunch = require('./brunch');
  optparse = require('./optparse');
  SWITCHES = [['new', '--new', 'create new brunch project'], ['compile', '--compile', 'compile brunch project'], ['-v', '--version', 'display brunch version'], ['-h', '--help', 'display this help message'], ['-p', '--projectTemplate [type]', 'set which kind of project template should be used'], ['watch', '--watch', 'watch files (currently you have to restart if files are added or renamed)']];
  BANNER = 'Usage: brunch [options] [<directory>]';
  options = {};
  exports.run = function() {
    var opts, projectName;
    opts = parseOptions();
    if (opts.help) {
      return usage();
    }
    if (opts.version) {
      return version();
    }
    projectName = opts.arguments[1];
    options.templateExtension = "eco";
    options.projectTemplate = "express";
    options = exports.loadOptionsFromArguments(opts, options);
    if (opts["new"]) {
      return brunch.newProject(projectName, options);
    } else if (opts.watch) {
      return brunch.watch(options);
    } else if (opts.compile) {
      return brunch.compile(options);
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
    if (opts.watch) {
      options.watch = opts.watch;
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
