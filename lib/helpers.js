(function() {
  var async, colorize, colors, exec, fileUtil, format, formatDate, fs, getColor, hasGrowl, pad, path, spawn, sys, walkTree, _, _ref;
  fs = require("fs");
  path = require("path");
  _ref = require("child_process"), exec = _ref.exec, spawn = _ref.spawn;
  async = require("async");
  fileUtil = require("file");
  _ = require("underscore");
  sys = require("sys");
  exports.copyFile = function(source, destination, callback) {
    var read, write;
    read = fs.createReadStream(source);
    write = fs.createWriteStream(destination);
    return sys.pump(read, write, function() {
      return callback();
    });
  };
  exports.walkTreeAndCopyFiles = walkTree = function(source, destination, callback) {
    return fs.readdir(source, function(err, files) {
      if (err) {
        return callback(err);
      }
      return async.forEach(files, function(file, next) {
        var destinationPath, sourcePath;
        if (file.match(/^\./)) {
          return next();
        }
        sourcePath = path.join(source, file);
        destinationPath = path.join(destination, file);
        return fs.stat(sourcePath, function(err, stats) {
          if (!err && stats.isDirectory()) {
            return fs.mkdir(destinationPath, 0755, function() {
              return walkTree(sourcePath, destinationPath, function(err, destinationPath) {
                if (destinationPath) {
                  return callback(err, destinationPath);
                } else {
                  return next();
                }
              });
            });
          } else {
            return exports.copyFile(sourcePath, destinationPath, function() {
              callback(err, destinationPath);
              return next();
            });
          }
        });
      }, callback);
    });
  };
  exports.recursiveCopy = function(source, destination, callback) {
    var paths;
    fileUtil.mkdirsSync(destination, 0755);
    paths = [];
    return walkTree(source, destination, function(err, filename) {
      if (err) {
        return callback(err);
      } else if (filename) {
        return paths.push(filename);
      } else {
        return callback(err, paths.sort());
      }
    });
  };
  exports.watchDirectory = function(_opts, callback) {
    var addToWatch, opts, watched;
    opts = _.extend({
      path: ".",
      persistent: true,
      interval: 500,
      callOnAdd: false
    }, _opts);
    watched = [];
    addToWatch = function(file) {
      return fs.realpath(file, function(err, filePath) {
        var callOnAdd, data, interval, isDir, persistent;
        callOnAdd = opts.callOnAdd;
        if (_.include(watched, filePath)) {
          callOnAdd = false;
        } else {
          isDir = false;
          watched.push(filePath);
          data = (persistent = opts.persistent, interval = opts.interval, opts);
          fs.watchFile(filePath, data, function(curr, prev) {
            if (curr.mtime.getTime() === prev.mtime.getTime()) {
              return;
            }
            if (isDir) {
              return addToWatch(filePath);
            } else {
              return callback(filePath);
            }
          });
        }
        return fs.stat(filePath, function(err, stats) {
          if (stats.isDirectory()) {
            isDir = true;
            return fs.readdir(filePath, function(err, files) {
              return process.nextTick(function() {
                var file, _i, _len, _results;
                _results = [];
                for (_i = 0, _len = files.length; _i < _len; _i++) {
                  file = files[_i];
                  _results.push(addToWatch("" + filePath + "/" + file));
                }
                return _results;
              });
            });
          } else {
            if (callOnAdd) {
              return callback(filePath);
            }
          }
        });
      });
    };
    return addToWatch(opts.path);
  };
  exports.filterFiles = function(files, sourcePath) {
    return files.filter(function(filename) {
      var stats;
      if (filename.match(/^\./)) {
        return false;
      }
      stats = fs.statSync(path.join(sourcePath, filename));
      if (stats != null ? stats.isDirectory() : void 0) {
        return false;
      }
      return true;
    });
  };
  exports.optionsInfo = function(options) {
    var name, option, output;
    output = "\n\nAvailable options:\n";
    for (name in options) {
      option = options[name];
      output += "-" + option.abbr + "\t--" + name + "\t" + option.help + "\n";
    }
    return output;
  };
  colors = {
    foreground: {
      black: 30,
      red: 31,
      green: 32,
      brown: 33,
      blue: 34,
      purple: 35,
      cyan: 36,
      lgray: 37,
      none: '',
      reset: 0
    }
  };
  getColor = function(color) {
    var code;
    color = color.toString();
    code = colors.foreground[color];
    return code || colors.foreground.none;
  };
  colorize = function(text, color) {
    return "\033[" + (getColor(color)) + "m" + text + "  \033[" + (getColor('reset')) + "m";
  };
  pad = function(number) {
    var num;
    num = "" + number;
    if (num.length < 2) {
      return "0" + num;
    } else {
      return num;
    }
  };
  formatDate = function(date) {
    var item, time;
    if (date == null) {
      date = new Date;
    }
    time = (function() {
      var _i, _len, _ref2, _results;
      _ref2 = ["Hours", "Minutes", "Seconds"];
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        item = _ref2[_i];
        _results.push(pad(date["get" + item]()));
      }
      return _results;
    })();
    return time.join(":");
  };
  format = function(text, color) {
    var date;
    date = formatDate(new Date);
    return "" + date + ": " + (colorize(text, color)) + "\n";
  };
  exports.isTesting = function() {
    if (global.describe && global.it) {
      return true;
    }
  };
  hasGrowl = false;
  exec("which growlnotify", function(error) {
    if (error == null) {
      return hasGrowl = true;
    }
  });
  exports.growl = function(title, text) {
    if (hasGrowl) {
      return spawn("growlnotify", [title, "-m", text]);
    }
  };
  exports.log = function(text, color, isError) {
    var stream;
    if (isError == null) {
      isError = false;
    }
    stream = isError ? process.stderr : process.stdout;
    if (!exports.isTesting()) {
      stream.write(format(text, color), "utf8");
    }
    if (isError) {
      return exports.growl("Brunch error", text);
    }
  };
  exports.logSuccess = function(text) {
    return exports.log(text, "green");
  };
  exports.logError = function(text) {
    return exports.log(text, "red", true);
  };
  exports.exit = function() {
    if (exports.isTesting()) {
      return exports.logError("Terminated process");
    } else {
      return process.exit(0);
    }
  };
}).call(this);
