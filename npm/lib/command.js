(function() {
  var BANNER, SWITCHES, brunch, fs, options, optparse, parseOptions, usage, version, yaml;
  fs = require('fs');
  yaml = require('yaml');
  brunch = require('./brunch');
  optparse = require('./optparse');
  SWITCHES = [['new', '--new', 'create new brunch project'], ['-v', '--version', 'display brunch version'], ['-h', '--help', 'display this help message'], ['-i', '--input [DIR]', 'set input path of project'], ['-o', '--output [DIR]', 'set output path of project'], ['-c', '--config [FILE]', 'set path of settings file'], ['watch', '--watch', 'watch files (currently you have to restart if files are added or renamed)']];
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
    options = exports.loadOptionsFromArguments(opts);
    options.templateExtension = "eco";
    if (opts["new"]) {
      return brunch.newProject(projectName, options);
    }
    return brunch.run(options);
  };
  exports.loadSettingsFromFile = function(settings_file) {
    var settings;
    settings_file || (settings_file = "settings.yaml");
    settings = yaml.eval(fs.readFileSync(settings_file, 'utf8'));
    if (!settings.namespace) {
      settings.namespace = "window";
    }
    if (!settings.templateExtension) {
      settings.templateExtension = "html";
    }
    if (!settings.input) {
      settings.input_dir = ".";
    }
    if (!settings.output) {
      settings.output_dir = "../build";
    }
    return settings;
  };
  exports.loadOptionsFromArguments = function(opts) {
    options = {};
    if (opts.namespace) {
      options.namespace = opts.namespace;
    }
    if (opts.templateExtension) {
      options.templateExtension = opts.templateExtension;
    }
    if (opts.input) {
      options.input_dir = opts.input;
    }
    if (opts.output) {
      options.output_dir = opts.output;
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
