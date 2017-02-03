const mediator = require('./mediator');
const smap = require('source-map');
const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;
const SourceNode = smap.SourceNode;

exports.OptimizeJob = {
  path: 'OptimizeJob',

  serialize(hash) {
    const optimizer = hash.optimizer.brunchPluginName;
    const params = hash.params;
    return {optimizer, params: {data: params.data, map: params.map, path: params.path}};
  },

  deserialize(ctx, hash) {
    const optimizer = ctx.plugins.optimizers.find(p => p.brunchPluginName === hash.optimizer);

    const deserializeSourceMap = serializedMap => {
      return SourceMapGenerator.fromSourceMap(new SourceMapConsumer(serializedMap));
    };

    const params = hash.params;
    params.map = deserializeSourceMap(params.map);

    return {optimizer, params};
  },

  work(hash) {
    const optimizer = hash.optimizer;
    const file = hash.params;

    return optimizer.optimize(file);
  },
};

exports.OPTIMIZE_FILE = {
  path: 'OPTIMIZE_FILE',

  // {data, path, map, sourceFiles, code: data}
  work(hash) {
    const optimizer = mediator.plugins.optimizers.find(p => p.brunchPluginName === hash.brunchPluginName);
    const file = hash.params;

    console.log('work hash', file.path);

    if (file.map && file.map.version) {
      file.map = SourceMapGenerator.fromSourceMap(new SourceMapConsumer((file.map)));
    }

    return optimizer.optimize(file);
  },
};
