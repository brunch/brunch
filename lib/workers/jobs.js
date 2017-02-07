'use strict';

const smap = require('source-map');
const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;

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
