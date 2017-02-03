const mediator = require('./mediator');
const smap = require('source-map');
const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;
const SourceNode = smap.SourceNode;

exports.OPTIMIZE_FILE = (hash) => {
  // {data, path, map, sourceFiles, code: data}
  const optimizer = mediator.plugins.optimizers.find(p => p.brunchPluginName === hash.brunchPluginName);
  const file = hash.params;

  console.log('work hash', file.path);

  if (file.map && file.map.version) {
    file.map = SourceMapGenerator.fromSourceMap(new SourceMapConsumer((file.map)));
  }

  return optimizer.optimize(file);
};
