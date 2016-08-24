'use strict';

const sysPath = require('universal-path');
const logger = require('loggy');
const BrunchError = require('./error');

const isEnabled = config => config.hot && !config.env.includes('production');

const checkAutoReload = (cfg, plugins) => {
  const hasAutoReload = plugins.compilers.find(compiler => compiler.brunchPluginName === 'auto-reload-brunch');
  if (!hasAutoReload) {
    throw new BrunchError('HMR_PLUGIN_MISSING');
  } else if (!hasAutoReload.supportsHMR) {
    throw new BrunchError('HMR_PLUGIN_UNSUPPORTED');
  }
};

const generate = (generateModuleFiles, nonModuleFiles, processor, deppack, definition, path, root) => {
  const hmrPath = sysPath.join('hmr-brunch', 'runtime.js');
  const hmrFile = nonModuleFiles.find(f => f.path.includes(hmrPath));

  if (hmrFile) {
    processor(hmrFile);
  } else {
    logger.warn(`HMR runtime not found for ${path}. HMR only works if use compile your JS into a single file, could it be the case?`);
  }

  root.add(definition);

  const depGraph = JSON.stringify(deppack.graph());
  root.add(`require.hmr(${depGraph}, function(require) {\n`);

  generateModuleFiles();

  root.add('});');
  root.add('// hmr end');

  nonModuleFiles.filter(f => f !== hmrFile).forEach(processor);
};

module.exports = {isEnabled, checkAutoReload, generate};
