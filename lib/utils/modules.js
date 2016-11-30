'use strict';
const sysPath = require('universal-path');
const commonRequireDefinition = require('commonjs-require-definition');

const getWrapperFn = wrapper => {
  switch (wrapper) {
    case 'commonjs':
      return name => {
        return {
          prefix: `require.register("${name}", function(exports, require, module) {\n`,
          suffix: '});\n\n',
        };
      };

    case 'amd':
      return (name, data) => {
        return {
          data: data.replace(/define\s*\(/, define => `${define}"${name}", `),
        };
      };

    case false:
      return (name, data) => data;
  }

  return wrapper;
};

exports.normalizeWrapper = (wrapper, nameCleaner) => {
  const wrapperFn = getWrapperFn(wrapper);

  return (path, compiled) => {
    const name = sysPath.normalize(path).replace(/^(\.\.\/)+/, '');
    const wrapped = wrapperFn(nameCleaner(name), compiled);

    if (typeof wrapped === 'string') {
      const sourcePos = wrapped.indexOf(compiled);

      return {
        prefix: wrapped.slice(0, sourcePos),
        data: sourcePos > 0 ? compiled : wrapped,
        suffix: wrapped.slice(sourcePos + compiled.length),
      };
    }

    return {
      prefix: wrapped.prefix || '',
      data: wrapped.data || compiled,
      suffix: wrapped.suffix || '',
    };
  };
};

exports.normalizeDefinition = definition => {
  switch (definition) {
    case 'commonjs':
      return () => commonRequireDefinition;
    case 'amd':
    case false:
      return () => '';
  }

  return definition;
};
