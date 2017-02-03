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
  serialize(hash) {
    const bp = hash.brunchPluginName || hash.optimizer.brunchPluginName;
    const p = hash.params;
    return {brunchPluginName: bp, params: {data: p.data, map: p.map, path: p.path}};
  },

  deserialize(hash) {
    const optimizer = mediator.plugins.optimizers.find(p => p.brunchPluginName === hash.brunchPluginName);
    const params = hash.params;

    console.log('hash', hash.params.path);

    if (params.map && params.map.version) {
      params.map = SourceMapGenerator.fromSourceMap(new SourceMapConsumer((params.map)));
    }

    return {optimizer, params};
  },

  work(hash) {
    const optimizer = hash.optimizer;
    const file = hash.params;

    return optimizer.optimize(file);
  },
};
