'use strict';

const shims = require('./shims');
const moduleDefinitions = require('./module-definitions');

const word = /^[_\w]+$/;
const glob = (globName, moduleName) => {
  const suffix = word.test(globName) ? `.${globName}` : `["${globName}"]`;
  return `window${suffix} = require("${moduleName}");`;
};

const getGlobals = (globals) => {
  const keys = Object.keys(globals);
  if (!keys.length) return '';
  const start = '\n\n// Auto-loaded modules from config.npm.globals.\n';
  const globbed = keys.map(globName => {
    return glob(globName, globals[globName]);
  }).join('\n');
  return start + globbed + '\n\n';
};

const processFiles = (configAliases, globals, usedShims, requiredAliases) => (root, files, processor) => {
  const usesProcess = usedShims.usesProcess();
  const _aliases = Object.assign({}, configAliases, requiredAliases);

  const aliases = Object.keys(_aliases).map(target => moduleDefinitions.aliasDef(target, _aliases[target]));

  const used = usedShims.toArray();
  const shimDefs = used.map(shims.getShimData).map((mapped, index) => {
    if (!mapped) return;
    const shim = used[index];
    return moduleDefinitions.simpleShimDef(shim, mapped);
  }).filter(item => item);

  const defs = shimDefs.join('\n');
  const proc = usesProcess ? '\nvar process;' : '';

  root.add(`\n(function() {
var global = window;${defs}${proc}${moduleDefinitions.makeRequire}`);
  files.forEach(processor);
  root.add(aliases.join('\n'));
  if (usesProcess) root.add("process = require('process');");
  root.add('})();');
  root.add(getGlobals(globals));
  root.add('\n\n');
};

module.exports = processFiles;
