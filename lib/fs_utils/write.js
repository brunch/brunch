'use strict';
const debug = require('debug')('brunch:write');
const sysPath = require('path');
const logger = require('loggy');

const deppack = require('deppack'); // getAllDependents
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

const getPaths = (type, isHelper, path, sourceFileJoinConfig) => {
  const hlprs = sourceFileJoinConfig.pluginHelpers;
  return Object.keys(sourceFileJoinConfig)
  .filter(key => key !== 'pluginHelpers')
  .filter(generatedFilePath => {
    if (isHelper) {
      return hlprs.indexOf(generatedFilePath) >= 0;
    } else {
      const checker = sourceFileJoinConfig[generatedFilePath];
      return checker(path);
    }
  });
};

const filterTargetsForEntry = (files, type, entry) => {
  const targets = files.map(file => {
    return Object.keys(file.targets).filter(ttype => ttype+'s' === type).map(ttype => {
      const target = file.targets[ttype];
      if (file.error == null && target.data == null) return;
      const mainTarget = file.type === ttype;
      return {
        path: file.path,
        data: target.data,
        node: target.node,
        type: type,
        isHelper: file.isHelper,
        source: mainTarget ? file.source : target.data,
        file: file
      };
    })
  }).filter(targets => targets).reduce((allTargets, targets) => allTargets.concat(targets));

  if (entry === '*') return targets;
  const depPaths = deppack.getAllDependents(entry);
  return targets.filter(t => depPaths.indexOf(t.path) !== -1);
};

const getFiles = (fileList, config, joinConfig) => {
  const _targetMap = {};
  const _sourcesMap = {};

  Object.keys(joinConfig).forEach(type => {
    const entryPoints = joinConfig[type];

    Object.keys(entryPoints).map(entry => {
      const subCfg = entryPoints[entry];

      const targets = filterTargetsForEntry(Array.from(fileList.files.values()), type, entry);
      targets.forEach(target => {
        const paths = getPaths(target.type, target.isHelper, target.path, subCfg);
        paths.forEach(path => {
          if (_targetMap[path] == null) _targetMap[path] = [];
          if (_sourcesMap[path] == null) _sourcesMap[path] = [];
          _targetMap[path].push(target);
          _sourcesMap[path].push(target.file);
        });
      });
    });
  });

  return Object.keys(_targetMap).map(generatedFilePath => {
    const targets = _targetMap[generatedFilePath];
    const sourceFiles = _sourcesMap[generatedFilePath];
    const type = targets[0] && targets[0].type;
    const legacySourceFiles = !type ? [] : sourceFiles.filter(f => f.type === type);
    const fullPath = sysPath.join(config.paths['public'], generatedFilePath);
    return {
      allSourceFiles: sourceFiles,
      sourceFiles: legacySourceFiles,
      targets: targets,
      path: fullPath,
      type: type
    };
  });
};

const checkWritten = (fileList, files, startTime) => {
  const allWrittenTargets = {};
  files.map(file => {
    file.targets.forEach(target => {
      if (!allWrittenTargets[target.type]) allWrittenTargets[target.type] = [];
      allWrittenTargets[target.type].push(target.path);
    });
  });

  fileList.files.forEach(file => {
    if (file.error) logger.error(formatWriteError(file));
    if (file.compilationTime >= startTime) {
      Object.keys(file.targets).forEach(type => {
        const target = file.targets[type];
        if (allWrittenTargets[type+'s'].indexOf(file.path) === -1 && target.data) {
          logger.warn(`${file.path} compiled, but not written. ` +
            `Check your ${type}s.joinTo config`);
        }
      });
    }
  });
};

const write = (fileList, config, joinConfig, optimizers, startTime) => {
  const files = getFiles(fileList, config, joinConfig);
  checkWritten(fileList, files, startTime);
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
    return generate(file.path, file.type, file.targets, config, optimizers);
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
