'use strict';
const debug = require('debug')('brunch:write');
const sysPath = require('path');
const logger = require('loggy');
const anymatch = require('anymatch');

const formatError = require('../helpers').formatError;
const generate = require('./generate');

// For use in `.filter()`.
const changedSince = startTime => generated => {
  const g = generated;
  return g.allSourceFiles.some(f => f.compilationTime >= startTime || f.removed);
};

const formatWriteError = sourceFile => {
  return formatError(sourceFile.error, sourceFile.path);
};

const getPaths = (type, isHelper, path, joinConfig) => {
  const sourceFileJoinConfig = joinConfig[type] || {};
  const hlprs = sourceFileJoinConfig.pluginHelpers;
  return Object.keys(sourceFileJoinConfig)
  .filter(key => {
    return key !== 'pluginHelpers';
  })
  .filter(generatedFilePath => {
    if (isHelper) {
      return hlprs.indexOf(generatedFilePath) >= 0;
    } else {
      const checker = sourceFileJoinConfig[generatedFilePath];
      return checker(path);
    }
  });
};

const getFiles = (fileList, config, joinConfig, startTime) => {
  const _targetMap = {};
  const _sourceMap = {};
  const anyJoinTo = {};
  const checkAnyJoinTo = file => {
    const ftype = file.type;
    if (anyJoinTo[ftype] == null) {
      anyJoinTo[ftype] = Object.keys(config.overrides)
        .map(key => config.overrides[key].files)
        .map(spec => {
          const key = file.type + 's';
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
    Object.keys(file.targets).forEach(type => {
      const mainTarget = file.type === type;
      const target = file.targets[type];
      if (file.error == null && target.data == null) return;
      const paths = getPaths(type + 's', file.isHelper, file.path, joinConfig);

      // we check & print the warning only when bundling a stylesheet as a stylesheet, for example
      // not when addings stylesheet's js code to the js bundle
      if (mainTarget && paths.length === 0) {
        if (file.error) logger.error(formatWriteError(file));
        if (target.data && file.compilationTime >= startTime) {
          if (!checkAnyJoinTo(file)) {
            logger.warn(`${file.path} compiled, but not written. ` +
              `Check your ${file.type}s.joinTo config`);
          }
        }
      }

      paths.forEach(path => {
        if (_targetMap[path] == null) _targetMap[path] = [];
        if (_sourceMap[path] == null) _sourceMap[path] = [];
        const targetObj = {
          path: file.path,
          data: target.data,
          node: target.node,
          type: type,
          source: mainTarget ? file.source : target.data
        };
        _targetMap[path].push(targetObj);
        _sourceMap[path].push(file);
      });
    });
  });

  return Object.keys(_targetMap).map(generatedFilePath => {
    const targets = _targetMap[generatedFilePath];
    const sourceFiles = _sourceMap[generatedFilePath];
    const type = targets[0] && targets[0].type;
    const legacySourceFiles = !type ? [] : sourceFiles.filter(f => f.type === type);
    const fullPath = sysPath.join(config.paths['public'], generatedFilePath);
    return {
      allSourceFiles: sourceFiles,
      sourceFiles: legacySourceFiles,
      targets: targets,
      path: fullPath
    };
  });
};

const write = (fileList, config, joinConfig, optimizers, startTime) => {
  const files = getFiles(fileList, config, joinConfig, startTime);

  const errors = files
    .map(generated => {
      return generated.sourceFiles
        .filter(f => f.error != null)
        .map(formatWriteError);
    })
    .reduce((a, b) => a.concat(b), []);

  if (errors.length > 0) return Promise.reject(errors.join(' ; '));

  const changed = files.filter(changedSince(startTime));
  debug(`Writing ${changed.length}/${files.length} files`);

  /* Remove files marked as such and dispose them, clean memory. */
  const disposed = {
    generated: [],
    sourcePaths: []
  };
  changed.forEach(generated => {
    const sourceFiles = generated.allSourceFiles;
    sourceFiles
      .filter(file => file.removed)
      .forEach(file => {
        disposed.generated.push(generated);
        disposed.sourcePaths.push(sysPath.basename(file.path));
        file.dispose();
        sourceFiles.splice(sourceFiles.indexOf(file), 1);
      });
  });

  const gen = file => {
    return generate(file.path, file.targets, config, optimizers);
  };

  return Promise.resolve(changed)
    .then(changedFiles => {
      return Promise.all(changedFiles.map(gen));
    })
    .then(() => {
      return Promise.resolve({
        changed: changed,
        disposed: disposed
      });
    });
};

module.exports = write;
