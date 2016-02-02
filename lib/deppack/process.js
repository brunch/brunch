'use strict';

const shims = require('./shims');
const modules = require('./modules');

const aliasedFileShims = Object.keys(shims.fileShims).reduce((acc, shim) => {
  const actualMod = modules.generateModuleName(shims.fileShims[shim]);
  if (shim !== actualMod) {
    acc[shim] = actualMod;
  }
  return acc;
}, {});

const insertGlobals = (config, root) => {
  const globals = Object.assign({}, config.npm.globals || {});

  Object.keys(globals).forEach(glob => {
    root.add(`window.${glob} = require('${globals[glob]}');`);
  });
};

const processFiles = (config, root, files, processor) => {
  const shimAliases = shims.getUsedShims().reduce((acc, x) => {
    if (aliasedFileShims[x]) {
      acc[x] = aliasedFileShims[x];
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

    var __makeRequire = function(r, __brmap) {
      return function(name) {
        if (__brmap[name] !== undefined) name = __brmap[name];
        name = name.replace(".js", "");
        return r(name);
      }
    };
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
