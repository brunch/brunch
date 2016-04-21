'use strict';

const sysPath = require('path');
const logger = require('loggy');

const isEnabled = config => config.hot && config.env.indexOf('production') === -1;

const checkAutoReload = (cfg, plugins) => {
  const hasAutoReload = plugins.compilers.find(compiler => compiler.brunchPluginName === 'auto-reload-brunch');
  if (!hasAutoReload) {
    throw new Error("Hot Module Reloading should only be used with 'auto-reload-brunch'");
  } else if (!hasAutoReload.supportsHMR) {
    throw new Error("Currently used version of 'auto-reload-brunch' does not support Hot Module Reloading");
  }
};

const generate = (generateModuleFiles, nonModuleFiles, processor, deppack, definition, path, root) => {
  const hmrFile = nonModuleFiles.find(x => x.path.indexOf(sysPath.join('hmr-brunch', 'runtime.js')) !== -1);
  nonModuleFiles = nonModuleFiles.filter(f => f !== hmrFile);

  if (hmrFile) {
    processor(hmrFile);
  } else {
    logger.warn(`HMR runtime not found for ${path}. HMR only works if use compile your JS into a single file, could it be the case?`);
  }

  root.add(definition);

  const depGraph = deppack.graph();
  root.add(`require.hmr(${JSON.stringify(depGraph)}, function(require) {\n`);

  generateModuleFiles();

  root.add('});');
  root.add('// hmr end');

  nonModuleFiles.forEach(processor);
};

module.exports = {isEnabled, checkAutoReload, generate};
