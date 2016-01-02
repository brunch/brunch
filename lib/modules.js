'use strict';
const debug = require('debug')('brunch:modules');
const commonRequireDefinition = require('commonjs-require-definition');

const backslashRe = new RegExp('\\\\', 'g');
const dotRe = new RegExp('^(\.\.\/)*', 'g');
const wrapperRe = /\.\w+$/;
const amdRe = /define\s*\(/;

const cleanModuleName = exports.cleanModuleName = (path, nameCleaner) => {
  return nameCleaner(path.replace(backslashRe, '/').replace(dotRe, ''));
};

const getModuleWrapper = (type, nameCleaner) => {
  return (fullPath, data, isVendor) => {
    const sourceURLPath = cleanModuleName(fullPath, nameCleaner);
    const moduleName = sourceURLPath.replace(wrapperRe, '');
    const path = JSON.stringify(moduleName);
    if (isVendor) {
      debug(`Not wrapping (is vendor file) ${moduleName}`);
      return data;
    }
    debug(`Wrapping ${moduleName} @ ${type}`);

    /* Wrap in common.js require definition. */
    if (type === 'commonjs') {
      return {
        prefix: 'require.register(' + path + ', function(exports, require, module) {\n',
        suffix: '});\n\n'
      };
    } else if (type === 'amd') {
      return {
        data: data.replace(amdRe, match => '' + match + path + ', ')
      };
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
      return (path, data) => {
        return data;
      };
    default:
      if (typeof typeOrFunction === 'function') {
        return typeOrFunction;
      } else {
        throw new Error('config.modules.wrapper should be a ' +
          'function or one of: "commonjs", "amd", false');
      }
  }
};

exports.normalizeWrapper = normalizeWrapper;

exports.normalizeDefinition = typeOrFunction => {
  switch (typeOrFunction) {
    case 'commonjs':
      return () => commonRequireDefinition;
    case 'amd':
    case false:
      return () => '';
    default:
      if (typeof typeOrFunction === 'function') {
        return typeOrFunction;
      } else {
        throw new Error('config.modules.definition should be a ' +
          'function or one of: "commonjs", false');
      }
  }
};
