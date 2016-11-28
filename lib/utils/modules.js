'use strict';
const debug = require('debug')('brunch:modules');
const commonRequireDefinition = require('commonjs-require-definition');

const backslashRe = new RegExp(String.raw`\\`, 'g');
const dotRe = /^(\.\.\/)*/g;

const cleanModuleName = (path, nameCleaner) => {
  return nameCleaner(path.replace(backslashRe, '/').replace(dotRe, ''));
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
