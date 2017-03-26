'use strict';
const debug = require('debug')('brunch:write');
const sysPath = require('universal-path');
const logger = require('loggy');
const deppack = require('deppack');
const generate = require('./generate');

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
      file,
      type,
      path: file.path,
      data: target.data,
      node: target.node,
      isHelper: file.isHelper,
      source: mainTarget ? file.source : target.data,
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

      const ftype = type.replace(/s$/, '');
      const allFiles = [...fileList.files.values()];
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
    Object.keys(file.targets).forEach(type => {
      if (!type) return;
      const target = file.targets[type];
      const allTargets = allWrittenTargets[type] || [];
      if (!allTargets.includes(file.path) && target.data) {
        logger.warn(`${file.path} compiled, but not written. Check your ${type}s.joinTo config`);
      }
    });
  });
};

const write = (fileList, config, startTime) => {
  const files = getFiles(fileList, config, joinConfig);
  checkWritten(fileList, files, startTime);

  const generated = changed.map(file => {
    return generate(file.path, file.targets, config, optimizers);
  });

  debug(`Writing ${changed.length}/${files.length} files`);

  return Promise.all(generated).then(() => changed);
};

module.exports = write;
