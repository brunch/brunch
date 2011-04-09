(function() {
  var async, fileUtil, fs, path, spawn, sys, _;
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  async = require('async');
  fileUtil = require('file');
  _ = require('underscore');
  sys = require('sys');
  exports.copyFile = function(source, destination, callback) {
    var read, write;
    read = fs.createReadStream(source);
    write = fs.createWriteStream(destination);
    return sys.pump(read, write, function() {
      return callback();
    });
  };
  exports.walkTreeAndCopyFiles = function(source, destination, callback) {
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
              return exports.walkTreeAndCopyFiles(sourcePath, destinationPath, function(err, destinationPath) {
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
    return exports.walkTreeAndCopyFiles(source, destination, function(err, filename) {
      if (err) {
        return callback(err);
      } else if (filename) {
        return paths.push(filename);
      } else {
        console.log(paths);
        return callback(err, paths.sort());
      }
    });
  };
  exports.watchDirectory = function(_opts, callback) {
    var addToWatch, opts, watched;
    opts = _.extend({
      path: '.',
      persistent: true,
      interval: 500,
      callOnAdd: false
    }, _opts);
    watched = [];
    addToWatch = function(file) {
      return fs.realpath(file, function(err, filePath) {
        var callOnAdd, isDir;
        callOnAdd = opts.callOnAdd;
        if (!_.include(watched, filePath)) {
          isDir = false;
          watched.push(filePath);
          fs.watchFile(filePath, {
            persistent: opts.persistent,
            interval: opts.interval
          }, function(curr, prev) {
            if (curr.mtime.getTime() === prev.mtime.getTime()) {
              return;
            }
            if (isDir) {
              return addToWatch(filePath);
            } else {
              return callback(filePath);
            }
          });
        } else {
          callOnAdd = false;
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
                  _results.push(addToWatch(filePath + '/' + file));
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
  exports.optionsInfo = function(options) {
    var option, output, _i, _len;
    output = "\n\nAvailable options:\n";
    for (_i = 0, _len = options.length; _i < _len; _i++) {
      option = options[_i];
      if (option.position === void 0) {
        output += "  " + option.string + "\t" + option.help + "\n";
      }
    }
    return output;
  };
  exports.log = function(info, options) {
    var d, timestamp;
    d = new Date();
    timestamp = exports.formatIsodate(d);
    return process.stdout.write(timestamp + " " + info);
  };
  exports.formatIsodate = function(d) {
    var pad;
    pad = function(n) {
      if (n < 10) {
        return '0' + n;
      } else {
        return n;
      }
    };
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
  };
}).call(this);
