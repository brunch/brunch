'use strict';
const debug = require('debug')('brunch:write');
const each = require('async-each');
const sysPath = require('path');
const generate = require('./generate');
const _helpers = require('../helpers');
const formatError = _helpers.formatError;
const logger = require('loggy');
const anymatch = require('anymatch');

const changedSince = function(startTime) {
  return function(generated) {
    return generated.sourceFiles.some(function(sourceFile) {
      return sourceFile.compilationTime >= startTime || sourceFile.removed;
    });
  };
};

const formatWriteError = function(sourceFile) {
  return formatError(sourceFile.error, sourceFile.path);
};

const getPaths = function(sourceFile, joinConfig) {
  var hlprs, sourceFileJoinConfig;
  sourceFileJoinConfig = joinConfig[sourceFile.type + 's'] || {};
  hlprs = sourceFileJoinConfig.pluginHelpers;
  return Object.keys(sourceFileJoinConfig).filter(function(key) {
    return key !== 'pluginHelpers';
  }).filter(function(generatedFilePath) {
    var checker;
    if (sourceFile.isHelper) {
      return hlprs.indexOf(generatedFilePath) >= 0;
    } else {
      checker = sourceFileJoinConfig[generatedFilePath];
      return checker(sourceFile.path);
    }
  });
};

const getFiles = function(fileList, config, joinConfig, startTime) {
  var anyJoinTo, checkAnyJoinTo, map;
  map = {};
  anyJoinTo = {};
  checkAnyJoinTo = function(file) {
    var joinSpecs, name;
    joinSpecs = anyJoinTo[name = file.type] != null ? anyJoinTo[name] : anyJoinTo[name] = Object.keys(config.overrides).map(function(_) {
      return config.overrides[_].files;
    }).map(function(spec) {
      var item, key;
      key = file.type + "s";
      item = spec && spec[key];
      return item && item.joinTo;
    }).filter(function(spec) {
      return spec;
    });

    /* config.files was copied to config.overrides._default.files */

    /*.concat [config.files] */
    if (typeof joinSpecs === 'function') {
      return joinSpecs(file.path);
    } else if (joinSpecs.some(function(_) {
      return typeof _ === 'string';
    })) {
      return anyJoinTo[file.type] = function() {
        return true;
      };
    } else if (!joinSpecs.length) {
      anyJoinTo[file.type] = function() {
        return false;
      };
      return false;
    } else {
      anyJoinTo[file.type] = anymatch(joinSpecs.reduce(function(flat, aJoinTo) {
        return flat.concat(Object.keys(aJoinTo).map(function(_) {
          return aJoinTo[_];
        }));
      }, []));
      return anyJoinTo[file.type](file.path);
    }
  };
  fileList.files.forEach(function(file) {
    var paths;
    if ((file.error == null) && (file.data == null)) {
      return;
    }
    paths = getPaths(file, joinConfig);
    paths.forEach(function(path) {
      if (map[path] == null) {
        map[path] = [];
      }
      return map[path].push(file);
    });
    if (!paths.length) {
      if (file.error) {
        logger.error(formatWriteError(file));
      }
      if (file.data && file.compilationTime >= startTime) {
        if (!checkAnyJoinTo(file)) {
          return logger.warn("'" + file.path + "' compiled, but not written. Check your " + file.type + "s.joinTo config.");
        }
      }
    }
  });
  return Object.keys(map).map(function(generatedFilePath) {
    var fullPath, sourceFiles;
    sourceFiles = map[generatedFilePath];
    fullPath = sysPath.join(config.paths["public"], generatedFilePath);
    return {
      sourceFiles: sourceFiles,
      path: fullPath
    };
  });
};

const write = module.exports = function(fileList, config, joinConfig, optimizers, startTime, callback) {
  var changed, disposed, errors, files, gen;
  files = getFiles(fileList, config, joinConfig, startTime);
  errors = files.map(function(generated) {
    return generated.sourceFiles.filter(function(_) {
      return _.error != null;
    }).map(formatWriteError);
  }).reduce((function(a, b) {
    return a.concat(b);
  }), []);
  if (errors.length > 0) {
    return callback(errors.join(' ; '));
  }
  changed = files.filter(changedSince(startTime));
  debug("Writing " + changed.length + "/" + files.length + " files");

  /* Remove files marked as such and dispose them, clean memory. */
  disposed = {
    generated: [],
    sourcePaths: []
  };
  changed.forEach(function(generated) {
    var sourceFiles;
    sourceFiles = generated.sourceFiles;
    return sourceFiles.filter(function(file) {
      return file.removed;
    }).forEach(function(file) {
      disposed.generated.push(generated);
      disposed.sourcePaths.push(sysPath.basename(file.path));
      file.dispose();
      return sourceFiles.splice(sourceFiles.indexOf(file), 1);
    });
  });
  gen = function(file, next) {
    return generate(file.path, file.sourceFiles, config, optimizers, next);
  };
  return each(changed, gen, function(error) {
    if (error != null) {
      return callback(error);
    }
    return callback(null, changed, disposed);
  });
};
