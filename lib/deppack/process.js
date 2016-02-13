'use strict';

const shims = require('./shims');
const modules = require('./modules');

const insertGlobals = (config, root) => {
  const globals = Object.assign({}, config.npm.globals || {});

  Object.keys(globals).forEach(glob => {
    root.add(`window.${glob} = require('${globals[glob]}');`);
  });
};

const processFiles = (config, root, files, processor) => {
  const shimAliases = shims.getUsedShims().reduce((acc, x) => {
    const mod = modules.generateModuleName(shims.fileShims[x]);
    if (mod !== x) {
      acc[x] = mod;
    }
    return acc;
  }, {});
  const usesProcess = shims.usesProcess();
  const _aliases = Object.assign({}, config.npm.aliases || {}, shimAliases, usesProcess ? {'process/browser': 'process'} : {});

  const aliases = Object.keys(_aliases).map(target => {
    if (shims.shouldSkipAlias(target)) return '';
    return modules.aliasDef(target, _aliases[target]);
  });

  const shimDefs = shims.getUsedShims().filter(shims.getShimData).map(shim => {
    return modules.simpleShimDef(shim, shims.getShimData(shim));
  });

  root.add(`(function() {
    var global = window;
    ${shimDefs.join('\n')}${usesProcess ? '\nvar process;' : ''}

    ${modules.makeRequire}
  `);
  files.forEach(processor);
  root.add(aliases.join('\n'));
  if (usesProcess) {
    root.add("process = require('process');");
  }
  root.add('})();');

  insertGlobals(config, root);
};

module.exports = processFiles;
