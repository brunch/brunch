'use strict';
const sysPath = require('universal-path');
const commonRequireDefinition = require('commonjs-require-definition');

const getWrapperFn = wrapper => {
  switch (wrapper) {
    case 'commonjs':
      return name => ({
        prefix: `require.register("${name}", function(exports, require, module) {\n`,
        suffix: '});\n\n',
      });

    case 'amd':
      return (name, data) => ({
        data: data.replace(/define\s*\(/, `$&"${name}", `),
      });

    case false:
      return (name, data) => data;
  }

  return wrapper;
};

const normalizeResult = wrapper => (name, data) => {
  const wrapped = wrapper(name, data);
  if (typeof wrapped === 'string') {
    const srcIndex = wrapped.indexOf(data);

    return {
      prefix: wrapped.slice(0, srcIndex),
      data: srcIndex > 0 ? data : wrapped,
      suffix: wrapped.slice(srcIndex + data.length),
    };
  }

  return {
    prefix: wrapped.prefix || '',
    data: wrapped.data || data,
    suffix: wrapped.suffix || '',
  };
};

exports.normalizeWrapper = (wrapper, nameCleaner) => {
  const wrapperFn = normalizeResult(getWrapperFn(wrapper));

  return (path, compiled) => {
    const name = sysPath.normalize(path).replace(/^(\.\.\/)+/, '');
    return wrapperFn(nameCleaner(name), compiled);
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
