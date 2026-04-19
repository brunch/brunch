(function() {
  var BANNER, SWITCHES, fusion, helpers, optparse, parseOptions, settings, usage, version;
  fusion = require('./fusion');
  optparse = require('./optparse');
  helpers = require('./helpers');
  SWITCHES = [['-v', '--version', 'display fusion version'], ['-h', '--help', 'display this help message'], ['-o', '--output [FILE]', 'set output path of templates'], ['-k', '--hook [FILE]', 'set path to a js file to hook in your own compile function'], ['-n', '--namespace [VALUE]', 'set export namespace'], ['-e', '--templateExtension [VALUE]', 'set extension of template files which should be compiled'], ['-c', '--config [FILE]', 'set path of settings file'], ['-w', '--watch', 'watch files (currently you have to restart if files are added or renamed)']];
  BANNER = 'Usage: fusion [options] [<directory>]';
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
    settings = fusion.loadSettingsFromFile(opts.config);
    settings = fusion.loadDefaultSettings(settings);
    settings = exports.loadSettingsFromArguments(settings, opts);
    fusion = fusion.loadHooks(settings.hook, fusion);
    return fusion.run(settings);
  };
  exports.loadSettingsFromArguments = function(currentSettings, opts) {
    if (opts.namespace) {
      currentSettings.namespace = opts.namespace;
    }
    if (opts.templateExtension) {
      currentSettings.templateExtension = opts.templateExtension;
    }
    if (opts.arguments[0]) {
      currentSettings.input = opts.arguments[0];
    }
    if (opts.output) {
      currentSettings.output = opts.output;
    }
    if (opts.hook) {
      currentSettings.hook = opts.hook;
    }
    if (opts.watch) {
      currentSettings.watch = opts.watch;
    }
    return currentSettings;
  };
  parseOptions = function() {
    var optionParser;
    optionParser = new optparse.OptionParser(SWITCHES, BANNER);
    return optionParser.parse(process.argv.slice(2));
  };
  usage = function() {
    helpers.printLine((new optparse.OptionParser(SWITCHES, BANNER)).help());
    return process.exit(0);
  };
  version = function() {
    helpers.printLine("Fusion version " + fusion.VERSION);
    return process.exit(0);
  };
}).call(this);
