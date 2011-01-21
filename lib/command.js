(function() {
  var BANNER, SWITCHES, brunch, fs, newProject, optparse, parseOptions, settings, usage, version, yaml;
  fs = require('fs');
  yaml = require('yaml');
  brunch = require('./brunch');
  optparse = require('./optparse');
  SWITCHES = [['new', '--new', 'create new brunch project'], ['-v', '--version', 'display brunch version'], ['-h', '--help', 'display this help message'], ['-i', '--input [DIR]', 'set input path of project'], ['-o', '--output [DIR]', 'set output path of project'], ['-c', '--config [FILE]', 'set path of settings file'], ['-w', '--watch', 'watch files (currently you have to restart if files are added or renamed)']];
  BANNER = 'Usage: brunch [options] [<directory>]';
  settings = {};
  exports.run = function() {
    var opts;
    opts = parseOptions();
    if (opts.help) {
      return usage();
    }
    if (opts.version) {
      return version();
    }
    if (opts["new"]) {
      return newProject();
    }
    if (opts.config) {
      exports.loadSettingsFromFile(opts.config);
    }
    exports.loadSettingsFromArguments(opts);
    return brunch.run(settings);
  };
  exports.loadSettingsFromFile = function(settings_file) {
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
  exports.loadSettingsFromArguments = function(opts) {
    if (opts.namespace) {
      settings.namespace = opts.namespace;
    }
    if (opts.templateExtension) {
      settings.templateExtension = opts.templateExtension;
    }
    if (opts.input) {
      settings.input_dir = opts.input;
    }
    if (opts.output) {
      settings.output_dir = opts.output;
    }
    if (opts.watch) {
      settings.watch = opts.watch;
    }
    return settings;
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
  newProject = function() {
    return brunch.newProject();
  };
}).call(this);
