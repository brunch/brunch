'use strict';
const debug = require('debug')('brunch:modules');
const sysPath = require('universal-path');
const commonRequireDefinition = require('commonjs-require-definition');

const cleanModuleName = (path, nameCleaner) => {
  const norm = sysPath.normalize(path).replace(/^(\.{2}\/)+/g, '');

  return nameCleaner(norm);
};

const getModuleWrapper = (type, nameCleaner, wrapper) => {
  return (fullPath, data, isVendor) => {
    const moduleName = cleanModuleName(fullPath, nameCleaner);
    const path = JSON.stringify(moduleName);
    if (isVendor) {
      debug(`Not wrapping (is vendor file) ${moduleName}`);
      return data;
    }
    debug(`Wrapping ${moduleName} @ ${type}`);

    // Wrap in common.js require definition.
    switch (type) {
      case 'commonjs':
        return {
          prefix: `require.register(${path}, function(exports, require, module) {\n`,
          suffix: '});\n\n',
        };
      case 'amd':
        return {
          data: data.replace(/define\s*\(/, define => `${define}${path}, `),
        };
      case 'function':
        return wrapper(moduleName, data);
    }
  };
};

const normalizeWrapper = (typeOrFunction, nameCleaner) => {
  switch (typeOrFunction) {
    case 'commonjs':
    case 'amd':
      return getModuleWrapper(typeOrFunction, nameCleaner);
    case false:
      return (path, data) => data;
  }
  if (typeof typeOrFunction === 'function') {
    return getModuleWrapper('function', nameCleaner, typeOrFunction);
  }
};

const normalizeDefinition = definition => {
  switch (definition) {
    case 'commonjs':
      return () => commonRequireDefinition;
    case 'amd':
    case false:
      return () => '';
  }

  return definition;
};

module.exports = {
  cleanModuleName,
  normalizeWrapper,
  normalizeDefinition,
};
