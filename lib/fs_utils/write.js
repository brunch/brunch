'use strict';
const debug = require('debug')('brunch:write');
const sysPath = require('universal-path');
const logger = require('loggy');

const deppack = require('deppack'); // getAllDependents
const formatError = require('../utils/helpers').formatError;
const generate = require('./generate');

// For use in `.filter()`.
const changedSince = startTime => generated => {
  return generated.allSourceFiles.some(f => f.compilationTime >= startTime || f.removed);
};

const getPaths = (type, isHelper, path, sourceFileJoinConfig) => {
  const helpers = sourceFileJoinConfig.pluginHelpers;
  return Object.keys(sourceFileJoinConfig)
    .filter(key /* generatedFilePath */ => {
      if (key === 'pluginHelpers') return;
      if (isHelper) return helpers.includes(key);

      const checker = sourceFileJoinConfig[key];
      return checker(path);
    });
};

const filterTargetsForEntry = (files, type, entry) => {
  const makeTarget = (file, target) => {
    if (file.error == null && target.data == null) return;
    const mainTarget = file.type === type;
    return {
      path: file.path,
      data: target.data,
      node: target.node,
      type,
      isHelper: file.isHelper,
      source: mainTarget ? file.source : target.data,
      file,
    };
  };

  const targets = files.map(file => {
    const rawTarget = file.targets[type];
    if (!rawTarget) return;
    return makeTarget(file, rawTarget);
  }).filter(target => target);

  // special entry point for joinTo - return all targets of matching type
  if (entry === '*') return targets;
  // otherwise, if normal entry point, gather its deps
  const depPaths = deppack.getAllDependents(entry);
  return targets.filter(t => depPaths.includes(t.path));
};

const getFiles = (fileList, config, joinConfig) => {
  const _targetMap = {};

  Object.keys(joinConfig).forEach(type => {
    const entryPoints = joinConfig[type];

    Object.keys(entryPoints).map(entry => {
      const subCfg = entryPoints[entry];

      const ftype = type.slice(0, -1); // javascripts -> javascript
      const allFiles = Array.from(fileList.files.values());
      const targets = filterTargetsForEntry(allFiles, ftype, entry);
      targets.forEach(target => {
        const paths = getPaths(target.type, target.isHelper, target.path, subCfg);
        paths.forEach(path => {
          if (_targetMap[path] == null) _targetMap[path] = [];
          _targetMap[path].push(target);
        });
      });
    });
  });

  return Object.keys(_targetMap).map(generatedFilePath => {
    const targets = _targetMap[generatedFilePath];
    const allSourceFiles = targets.map(target => target.file);
    const type = targets[0] && targets[0].type;
    const isJs = type => type === 'javascript' || type === 'template';
    const sourceFiles = type ?
      allSourceFiles.filter(f => f.type === type || isJs(f.type) && isJs(type)) :
      [];
    const path = sysPath.join(config.paths.public, generatedFilePath);
    return {allSourceFiles, sourceFiles, path, targets, type};
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
    if (file.error) logger.error(formatError(file));
    if (file.compilationTime >= startTime) {
      Object.keys(file.targets).forEach(type => {
        const target = file.targets[type];
        const allTargets = allWrittenTargets[type] || [];
        if (!allTargets.includes(file.path) && target.data) {
          logger.warn(`${file.path} compiled, but not written. ` +
            `Check your ${type}s.joinTo config`);
        }
      });
    }
  });
};

const writeStatic = (fileList, config, startTime) => {
  const staticFiles = Array.from(fileList.staticFiles.values());
  const errors = staticFiles.filter(f => f.error).map(formatError);
  if (errors.length) throw errors.join(' ; ');

  const changed = staticFiles.filter(f => f.compilationTime >= startTime || f.removed);

  const toRemove = changed.filter(f => f.removed);
  const toWrite = changed.filter(f => !f.removed);

  debug(`Writing ${toWrite.length}/${staticFiles.length} static files, removing ${toRemove.length}`);

  return generate.writeStatics(toRemove, toWrite);
};

const write = (fileList, config, joinConfig, optimizers, startTime) => {
  const files = getFiles(fileList, config, joinConfig);
  checkWritten(fileList, files, startTime);
  const errors = files
    .map(generated => {
      return generated.sourceFiles
        .filter(f => f.error != null)
        .map(formatError);
    })
    .reduce((a, b) => a.concat(b), []);

  if (errors.length) return Promise.reject(errors.join(' ; '));

  const changed = files.filter(changedSince(startTime));
  debug(`Writing ${changed.length}/${files.length} files`);

  // Remove files marked as such and dispose them, clean memory.
  const disposed = {generated: [], sourcePaths: []};
  changed.forEach(generated => {
    const sourceFiles = generated.allSourceFiles;
    sourceFiles
      .filter(file => file.removed)
      .forEach(file => {
        disposed.generated.push(generated);
        disposed.sourcePaths.push(sysPath.basename(file.path));
        file.dispose();
      });

    generated.targets = generated.targets.filter(x => !x.file.disposed);
  });

  return Promise.all(changed.map(file => {
    return generate(file.path, file.targets, config, optimizers);
  })).then(() => {
    return writeStatic(fileList, config, startTime);
  }).then(() => {
    return {changed, disposed};
  });
};

module.exports = write;
