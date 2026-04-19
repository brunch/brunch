(function() {
  var fs, helpers, path, resetGlobals, watcher, yaml, _;
  _ = require('underscore');
  fs = require('fs');
  path = require('path');
  helpers = require('./helpers');
  watcher = require('watch');
  yaml = require('yaml');
  exports.VERSION = '0.0.8';
  exports.sources = [];
  exports.settings = {};
  exports.output = [];
  exports.run = function(settings) {
    exports.settings = settings;
    exports.mergeFiles();
    if (exports.settings.watch) {
      return exports.watch();
    }
  };
  exports.mergeFiles = function(callback) {
    var options;
    options = {
      ignoreDotFiles: true
    };
    options.filter = function(file) {
      if (path.extname(file) === ("." + exports.settings.templateExtension) || path.extname(file) === "") {
        return false;
      } else {
        return true;
      }
    };
    return watcher.walk(exports.settings.input, options, function(err, files) {
      exports.sources = files;
      exports.generateOutput();
      return exports.writeOutputFile(callback);
    });
  };
  exports.generateOutput = function() {
    var dirPrefix, dirPrefixMatch, source, stat, templateContent, _ref, _results;
    dirPrefixMatch = exports.settings.input.match(new RegExp("^(.*\/{1})[^\/]*$"), 'a');
    dirPrefix = dirPrefixMatch ? dirPrefixMatch[1] : '';
    _ref = exports.sources;
    _results = [];
    for (source in _ref) {
      stat = _ref[source];
      _results.push(stat.isDirectory() ? exports.output.push(exports.createDirectoryObject(source, dirPrefix)) : (templateContent = fs.readFileSync(source, 'utf8'), exports.output.push(exports.createTemplateObject(templateContent, source, dirPrefix))));
    }
    return _results;
  };
  exports.createDirectoryObject = function(source, directoryPrefix) {
    var namespace;
    namespace = source.replace(directoryPrefix, '');
    namespace = namespace.replace(/\//g, '.');
    return "" + exports.settings.namespace + "." + namespace + " = {};";
  };
  exports.createTemplateObject = function(content, source, directoryPrefix) {
    return "" + (exports.templateNamespace(source, directoryPrefix)) + " = " + (exports.compileTemplate(content)) + ";";
  };
  exports.templateNamespace = function(source, directoryPrefix) {
    var namespace;
    namespace = source.replace(directoryPrefix, '');
    namespace = namespace.match(new RegExp("^(.*)\." + exports.settings.templateExtension + "$"), 'a')[1];
    namespace = namespace.replace(/\//g, '.');
    namespace = helpers.underscoreToCamelCase(namespace);
    return "" + exports.settings.namespace + "." + namespace;
  };
  exports.compileTemplate = function(content) {
    content = content.replace(/\n/g, '\\n');
    content = content.replace(/'/g, '\\\'');
    return content = "'" + content + "'";
  };
  exports.writeOutputFile = function(callback) {
    var templates;
    templates = exports.output.join('');
    templates = "(function(){" + templates + "}).call(this);";
    return fs.writeFile(exports.settings.output, templates, function(err) {
      helpers.printLine("Compiled files");
      if (callback) {
        return callback();
      }
    });
  };
  exports.watch = function() {
    return watcher.createMonitor(exports.settings.input, {
      persistent: true,
      interval: 500
    }, function(monitor) {
      monitor.on("changed", function(file) {
        resetGlobals();
        return exports.mergeFiles();
      });
      monitor.on("created", function(file) {
        resetGlobals();
        return exports.mergeFiles();
      });
      return monitor.on("removed", function(file) {
        resetGlobals();
        return exports.mergeFiles();
      });
    });
  };
  exports.loadSettingsFromFile = function(settings_file) {
    var currentSettings, stats;
    settings_file || (settings_file = "settings.yaml");
    try {
      stats = fs.statSync(settings_file);
      currentSettings = yaml.eval(fs.readFileSync(settings_file, 'utf8'));
    } catch (e) {
      helpers.printLine("Couldn't find a settings file");
      currentSettings = {};
    }
    return currentSettings;
  };
  exports.loadDefaultSettings = function(currentSettings) {
    if (!currentSettings.namespace) {
      currentSettings.namespace = "window";
    }
    if (!currentSettings.templateExtension) {
      currentSettings.templateExtension = "html";
    }
    if (!currentSettings.input) {
      currentSettings.input = "templates";
    }
    if (!currentSettings.output) {
      currentSettings.output = "templates.js";
    }
    if (!currentSettings.hook) {
      currentSettings.hook = "fusion_hooks.js";
    }
    return currentSettings;
  };
  exports.loadHooks = function(hook_file, currentFusion) {
    var fileName, hooks, stats;
    try {
      stats = fs.statSync(hook_file);
      fileName = path.basename(hook_file);
      hook_file = path.join(path.dirname(fs.realpathSync(hook_file)), fileName);
      hooks = require(hook_file);
      _.each(hooks, function(value, key) {
        return currentFusion[key] = value;
      });
    } catch (e) {
      helpers.printLine("No hooks have been loaded.");
    }
    return currentFusion;
  };
  resetGlobals = function() {
    exports.output = [];
    return exports.sources = [];
  };
}).call(this);
