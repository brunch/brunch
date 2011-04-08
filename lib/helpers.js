(function() {
  var async, exec, fileUtil, fs, path, _;
  fs = require('fs');
  path = require('path');
  exec = require('child_process').exec;
  async = require('async');
  fileUtil = require('file');
  _ = require('underscore');
  exports.copy = function(source, target) {
    return exec('cp -R ' + source + ' ' + target, function(error, stdout, stderr) {
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.log(stderr);
      }
      if (error) {
        return console.log(error);
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
