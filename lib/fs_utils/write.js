'use strict';
const debug = require('debug')('brunch:write');
const each = require('async-each');
const sysPath = require('path');
const generate = require('./generate');
const _helpers = require('../helpers');
const formatError = _helpers.formatError;
const logger = require('loggy');
const anymatch = require('anymatch');

// For use in `.filter()`.
const changedSince = startTime => {
  return generated => {
    return generated.sourceFiles.some(sourceFile => {
      return sourceFile.compilationTime >= startTime ||
             sourceFile.removed;
    });
  };
};

const formatWriteError = sourceFile => {
  return formatError(sourceFile.error, sourceFile.path);
};

const getPaths = (sourceFile, joinConfig) => {
  const sourceFileJoinConfig = joinConfig[sourceFile.type + 's'] || {};
  const hlprs = sourceFileJoinConfig.pluginHelpers;
  return Object.keys(sourceFileJoinConfig)
  .filter(key => {
    return key !== 'pluginHelpers';
  })
  .filter(generatedFilePath => {
    if (sourceFile.isHelper) {
      return hlprs.indexOf(generatedFilePath) >= 0;
    } else {
      const checker = sourceFileJoinConfig[generatedFilePath];
      return checker(sourceFile.path);
    }
  });
};

const getFiles = (fileList, config, joinConfig, startTime) => {
  const map = {};
  const anyJoinTo = {};
  const checkAnyJoinTo = file => {
    const ftype = file.type;
    if (anyJoinTo[ftype] == null) {
      anyJoinTo[ftype] = Object.keys(config.overrides)
        .map(_ => config.overrides[_].files)
        .map(spec => {
          const key = file.type + "s";
          const item = spec && spec[key];
          return item && item.joinTo;
        })
        .filter(spec => spec);
    }
    const joinSpecs = anyJoinTo[ftype];

    /* config.files was copied to config.overrides._default.files */

    /*.concat [config.files] */
    if (typeof joinSpecs === 'function') {
      return joinSpecs(file.path);
    } else if (joinSpecs.some(spec => typeof spec === 'string')) {
      return anyJoinTo[file.type] = () => true;
    } else if (!joinSpecs.length) {
      anyJoinTo[file.type] = () => false;
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
    if (file.error == null && file.data == null) return;
    const paths = getPaths(file, joinConfig);
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
    const sourceFiles = map[generatedFilePath];
    const fullPath = sysPath.join(config.paths["public"], generatedFilePath);
    return {
      sourceFiles: sourceFiles,
      path: fullPath
    };
  });
};

const write = module.exports = (fileList, config, joinConfig, optimizers, startTime, callback) => {
  const files = getFiles(fileList, config, joinConfig, startTime);
  const errors = files
    .map(generated => {
      return generated.sourceFiles
        .filter(f => f.error != null)
        .map(formatWriteError);
    })
    .reduce( ((a, b) => a.concat(b)), []);
  if (errors.length > 0) return callback(errors.join(' ; '));
  const changed = files.filter(changedSince(startTime));
  debug(`Writing ${changed.length}/${files.length} files`);

  /* Remove files marked as such and dispose them, clean memory. */
  const disposed = {
    generated: [],
    sourcePaths: []
  };
  changed.forEach(generated => {
    const sourceFiles = generated.sourceFiles;
    sourceFiles
      .filter(file => {
        return file.removed;
      })
      .forEach(file => {
        disposed.generated.push(generated);
        disposed.sourcePaths.push(sysPath.basename(file.path));
        file.dispose();
        sourceFiles.splice(sourceFiles.indexOf(file), 1);
      });
  });
  const gen = (file, next) => {
    generate(file.path, file.sourceFiles, config, optimizers, next);
  };
  return each(changed, gen, error => {
    if (error != null) return callback(error);
    callback(null, changed, disposed);
  });
};
