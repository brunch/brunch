'use strict';

const shims = require('./shims');
const modules = require('./modules');
const moduleDefinitions = require('./module-definitions');

const word = /^[_\w]+$/;

const getGlobals = (config) => {
  const globals = Object.assign({}, config.npm.globals || {});
  const keys = Object.keys(globals);
  if (!keys.length) return '';
  const start = '\n\n// Auto-loaded modules from config.npm.globals.\n';
  const globbed = keys.map(glob => {
    const suffix = word.test(glob) ? `.${glob}` : `["${glob}"]`;
    return `window${suffix} = require("${globals[glob]}");`;
  }).join('\n');
  const end = '\n\n';
  return start + globbed + end;
};

const processFiles = (config, root, files, processor) => {
  const usesProcess = shims.usesProcess();
  const _aliases = Object.assign({}, config.npm.aliases || {}, modules.requiredAliases());

  const aliases = Object.keys(_aliases).map(target => moduleDefinitions.aliasDef(target, _aliases[target]));

  const used = shims.getUsedShims();
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
  root.add(getGlobals(config));
  root.add('\n\n');
};

module.exports = processFiles;
