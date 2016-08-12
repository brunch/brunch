'use strict';
const debug = require('debug')('brunch:modules');
const commonRequireDefinition = require('commonjs-require-definition');
const BrunchError = require('./error');

const backslashRe = new RegExp(String.raw`\\`, 'g');
const dotRe = /^(\.\.\/)*/g;
const amdRe = /define\s*\(/;

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
          data: data.replace(amdRe, match => `${match}${path}, `),
        };
      case 'function':
        return wrapper(moduleName, data);
    }
  };
};

const normalizeWrapper = (typeOrFunction, nameCleaner) => {
  switch (typeOrFunction) {
    case 'commonjs':
      return getModuleWrapper('commonjs', nameCleaner);
    case 'amd':
      return getModuleWrapper('amd', nameCleaner);
    case false:
      return (path, data) => data;
  }
  if (typeof typeOrFunction === 'function') {
    return getModuleWrapper('function', nameCleaner, typeOrFunction);
  }
  throw new BrunchError('MODULES_WRAP_INVALID');
};

const normalizeDefinition = typeOrFunction => {
  switch (typeOrFunction) {
    case 'commonjs':
      return () => commonRequireDefinition;
    case 'amd':
    case false:
      return () => '';
  }
  if (typeof typeOrFunction === 'function') {
    return typeOrFunction;
  }
  throw new BrunchError('MODULES_DEF_INVALID');
};

module.exports = {
  cleanModuleName,
  normalizeWrapper,
  normalizeDefinition,
};
