'use strict';

const sysPath = require('universal-path');
const logger = require('loggy');

exports.isEnabled = config => config.hot && !config.env.includes('production');
exports.generate = (generateModuleFiles, nonModuleFiles, processor, deppack, definition, path, root) => {
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
