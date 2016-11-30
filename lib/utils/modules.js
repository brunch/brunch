'use strict';
const sysPath = require('universal-path');
const commonRequireDefinition = require('commonjs-require-definition');

const normalizeWrapper = (wrapper, nameCleaner) => {
  const clean = wrap => (path, data) => {
    const norm = sysPath.normalize(path).replace(/^(\.\.\/)+/, '');

    return wrap(nameCleaner(norm), data);
  };

  switch (wrapper) {
    case 'commonjs':
      return clean(name => {
        return {
          prefix: `require.register("${name}", function(exports, require, module) {\n`,
          suffix: '});\n\n',
        };
      });

    case 'amd':
      return clean((name, data) => {
        return {
          data: data.replace(/define\s*\(/, define => `${define}"${name}", `),
        };
      });

    case false:
      return (name, data) => data;
  }

  return clean(wrapper);
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
  normalizeWrapper,
  normalizeDefinition,
};
