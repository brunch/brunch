'use strict';
const debug = require('debug')('brunch:write');
const each = require('async-each');
const sysPath = require('path');
const generate = require('./generate');
const _helpers = require('../helpers');
const formatError = _helpers.formatError;
const logger = require('loggy');
const anymatch = require('anymatch');

const changedSince = startTime => {
  return generated => {
    return generated.sourceFiles.some(sourceFile => {
      return sourceFile.compilationTime >= startTime || sourceFile.removed;
    });
  };
};

const formatWriteError = sourceFile => {
  return formatError(sourceFile.error, sourceFile.path);
};

const getPaths = (sourceFile, joinConfig) => {
  var hlprs, sourceFileJoinConfig;
  sourceFileJoinConfig = joinConfig[sourceFile.type + 's'] || {};
  hlprs = sourceFileJoinConfig.pluginHelpers;
  return Object.keys(sourceFileJoinConfig).filter(key => {
    return key !== 'pluginHelpers';
  }).filter(generatedFilePath => {
    var checker;
    if (sourceFile.isHelper) {
      return hlprs.indexOf(generatedFilePath) >= 0;
    } else {
      checker = sourceFileJoinConfig[generatedFilePath];
      return checker(sourceFile.path);
    }
  });
};

const getFiles = (fileList, config, joinConfig, startTime) => {
  var anyJoinTo, checkAnyJoinTo, map;
  map = {};
  anyJoinTo = {};
  checkAnyJoinTo = file => {
    var joinSpecs, name;
    joinSpecs = anyJoinTo[name = file.type] != null ? anyJoinTo[name] : anyJoinTo[name] = Object.keys(config.overrides).map(_ => {
      return config.overrides[_].files;
    }).map(spec => {
      var item, key;
      key = file.type + "s";
      item = spec && spec[key];
      return item && item.joinTo;
    }).filter(spec => {
      return spec;
    });

    /* config.files was copied to config.overrides._default.files */

    /*.concat [config.files] */
    if (typeof joinSpecs === 'function') {
      return joinSpecs(file.path);
    } else if (joinSpecs.some(_ => {
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
      anyJoinTo[file.type] = anymatch(joinSpecs.reduce((flat, aJoinTo) => {
        return flat.concat(Object.keys(aJoinTo).map(_ => {
          return aJoinTo[_];
        }));
      }, []));
      return anyJoinTo[file.type](file.path);
    }
  };
  fileList.files.forEach(file => {
    var paths;
    if ((file.error == null) && (file.data == null)) {
      return;
    }
    paths = getPaths(file, joinConfig);
    paths.forEach(path => {
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
  return Object.keys(map).map(generatedFilePath => {
    var fullPath, sourceFiles;
    sourceFiles = map[generatedFilePath];
    fullPath = sysPath.join(config.paths["public"], generatedFilePath);
    return {
      sourceFiles: sourceFiles,
      path: fullPath
    };
  });
};

const write = module.exports = (fileList, config, joinConfig, optimizers, startTime, callback) => {
  var changed, disposed, errors, files, gen;
  files = getFiles(fileList, config, joinConfig, startTime);
  errors = files.map(generated => {
    return generated.sourceFiles.filter(_ => {
      return _.error != null;
    }).map(formatWriteError);
  }).reduce(((a, b) => {
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
  changed.forEach(generated => {
    var sourceFiles;
    sourceFiles = generated.sourceFiles;
    return sourceFiles.filter(file => {
      return file.removed;
    }).forEach(file => {
      disposed.generated.push(generated);
      disposed.sourcePaths.push(sysPath.basename(file.path));
      file.dispose();
      return sourceFiles.splice(sourceFiles.indexOf(file), 1);
    });
  });
  gen = (file, next) => {
    return generate(file.path, file.sourceFiles, config, optimizers, next);
  };
  return each(changed, gen, error => {
    if (error != null) {
      return callback(error);
    }
    return callback(null, changed, disposed);
  });
};
