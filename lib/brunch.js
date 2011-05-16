(function() {
  var colors, expressProcess, fileUtil, fs, helpers, nibAvailable, package, path, root, spawn, stitch, stylus, timeouts, _;
  root = __dirname + "/../";
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  helpers = require('./helpers');
  fileUtil = require('file');
  colors = require('../vendor/termcolors').colors;
  stitch = require('stitch');
  stylus = require('stylus');
  _ = require('underscore');
  exports.VERSION = '0.7.1';
  expressProcess = {};
  package = {};
  timeouts = {};
  nibAvailable = (function() {
    try {
      if (require('nib')) {
        return true;
      }
    } catch (error) {
      return false;
    }
  })();
  exports["new"] = function(options, callback) {
    var projectTemplatePath;
    exports.options = options;
    projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate);
    return path.exists(exports.options.brunchPath, function(exists) {
      if (exists) {
        helpers.log(colors.lred("brunch:   directory already exists - can't create a project in there\n", true));
        process.exit(0);
      }
      fileUtil.mkdirsSync(exports.options.brunchPath, 0755);
      fileUtil.mkdirsSync(exports.options.buildPath, 0755);
      return helpers.recursiveCopy(projectTemplatePath, exports.options.brunchPath, function() {
        return helpers.recursiveCopy(path.join(projectTemplatePath, 'build/'), exports.options.buildPath, function() {
          callback();
          return helpers.log("brunch:   " + (colors.green('created', true)) + " brunch directory layout\n");
        });
      });
    });
  };
  exports.watch = function(options) {
    exports.options = options;
    exports.createBuildDirectories(exports.options.buildPath);
    exports.initializePackage(exports.options.brunchPath);
    path.exists(path.join(exports.options.brunchPath, 'server/main.js'), function(exists) {
      if (exists) {
        helpers.log("express:  application started on port " + (colors.blue(exports.options.expressPort, true)) + ": http://0.0.0.0:" + exports.options.expressPort + "\n");
        expressProcess = spawn('node', [path.join(exports.options.brunchPath, 'server/main.js'), exports.options.expressPort, exports.options.brunchPath]);
        return expressProcess.stderr.on('data', function(data) {
          return helpers.log(colors.lred('express err: ' + data));
        });
      }
    });
    return helpers.watchDirectory({
      path: path.join(exports.options.brunchPath, 'src'),
      callOnAdd: true
    }, function(file) {
      return exports.dispatch(file);
    });
  };
  exports.build = function(options) {
    exports.options = options;
    exports.createBuildDirectories(exports.options.buildPath);
    exports.initializePackage(exports.options.brunchPath);
    exports.compilePackage();
    return exports.compileStylus();
  };
  exports.stop = function() {
    if (expressProcess !== {}) {
      return expressProcess.kill('SIGHUP');
    }
  };
  exports.createBuildDirectories = function(buildPath) {
    fileUtil.mkdirsSync(path.join(buildPath, 'web/js'), 0755);
    return fileUtil.mkdirsSync(path.join(buildPath, 'web/css'), 0755);
  };
  exports.collectDependencies = function(sourcePath, orderedDependencies) {
    var additionalLibaries, args, dependencies, dependencyPaths, filenames;
    filenames = fs.readdirSync(sourcePath);
    filenames = helpers.filterFiles(filenames, sourcePath);
    args = orderedDependencies.slice();
    args.unshift(filenames);
    additionalLibaries = _.without.apply(this, args);
    dependencies = orderedDependencies.concat(additionalLibaries);
    return dependencyPaths = _.map(dependencies, function(filename) {
      return path.join(sourcePath, filename);
    });
  };
  exports.initializePackage = function(brunchPath) {
    var dependencyPaths, vendorPath;
    vendorPath = path.join(brunchPath, 'src/vendor');
    dependencyPaths = exports.collectDependencies(vendorPath, exports.options.dependencies);
    package = stitch.createPackage({
      dependencies: dependencyPaths,
      paths: [path.join(brunchPath, 'src/app/')]
    });
    return package;
  };
  exports.dispatch = function(file, options) {
    var queueCoffee, templateExtensionRegex, vendorPath;
    queueCoffee = function(func) {
      clearTimeout(timeouts.coffee);
      return timeouts.coffee = setTimeout(func, 100);
    };
    vendorPath = path.join(exports.options.brunchPath, 'src/vendor');
    if (file.match(/src\/vendor\//)) {
      package.dependencies = exports.collectDependencies(vendorPath, exports.options.dependencies);
    }
    if (file.match(/\.coffee$/)) {
      queueCoffee(function() {
        return exports.compilePackage();
      });
    }
    templateExtensionRegex = new RegExp("" + exports.options.templateExtension + "$");
    if (file.match(templateExtensionRegex)) {
      exports.compilePackage();
    }
    if (file.match(/src\/.*\.js$/)) {
      exports.compilePackage();
    }
    if (file.match(/\.styl$/)) {
      return exports.compileStylus();
    }
  };
  exports.compilePackage = function() {
    return package.compile(function(err, source) {
      if (err != null) {
        helpers.log("brunch:   " + (colors.lred('There was a problem during compilation.', true)) + "\n");
        return helpers.log("" + (colors.lgray(err, true)) + "\n");
      } else {
        return fs.writeFile(path.join(exports.options.buildPath, 'web/js/app.js'), source, function(err) {
          if (err != null) {
            helpers.log("brunch:   " + (colors.lred('Couldn\'t write compiled file.', true)) + "\n");
            return helpers.log("" + (colors.lgray(err, true)) + "\n");
          } else {
            return helpers.log("stitch:   " + (colors.green('compiled', true)) + " application\n");
          }
        });
      }
    });
  };
  exports.compileStylus = function() {
    var main_file_path;
    main_file_path = path.join(exports.options.brunchPath, 'src/app/styles/main.styl');
    return fs.readFile(main_file_path, 'utf8', function(err, data) {
      if (err != null) {
        return helpers.log(colors.lred('stylus err: ' + err));
      } else {
        return stylus(data).set('filename', main_file_path).set('compress', true).include(path.join(exports.options.brunchPath, 'src')).include(nibAvailable ? require('nib').path : '').render(function(err, css) {
          if (err != null) {
            return helpers.log(colors.lred('stylus err: ' + err));
          } else {
            return fs.writeFile(path.join(exports.options.buildPath, 'web/css/main.css'), css, 'utf8', function(err) {
              if (err != null) {
                return helpers.log(colors.lred('stylus err: ' + err));
              } else {
                return helpers.log("stylus:   " + (colors.green('compiled', true)) + " main.css\n");
              }
            });
          }
        });
      }
    });
  };
}).call(this);
