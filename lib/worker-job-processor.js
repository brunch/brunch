'use strict';
const application = require('./application');
const plugins = require('./plugins');
const pipeline = require('./fs_utils/pipeline').actual;
const helpers = require('./helpers');
const sm = require('source-map');
const detective = require('detective');

let cfg, plugs; // eslint-disable-line prefer-const

application.loadConfigWorker(false, JSON.parse(process.env.BRUNCH_OPTIONS)).then(_cfg => {
  cfg = _cfg;
  return plugins.init(cfg, () => {}).then(_plugins => {
    plugs = _plugins;
    process.send('ready');
  });
});

const deserializeSourceMap = serializedMap => {
  return sm.SourceMapGenerator.fromSourceMap(new sm.SourceMapConsumer(serializedMap));
};

const processMsg = (msg) => {
  const type = msg.type;
  const data = msg.data;

  if (type === 'compile') {
    const path = data.path;
    const compilers = plugs.compilers.filter(plugins.isPluginFor(path));
    const linters = plugs.linters.filter(plugins.isPluginFor(path));

    return pipeline(data.path, data.source, linters, compilers);
  } else if (type === 'optimize') {
    const optName = data.optimizer;
    const params = data.params;

    params.map = deserializeSourceMap(params.map);

    const optimizer = plugs.optimizers.find(p => p.constructor.brunchPluginName === optName);
    const optimizerArgs = optimizer.optimize.length === 2 || optimizer.optimize.length === 1 ?
      [params] : [params.data, params.path];

    return helpers.promisifyPlugin(1, optimizer.optimize)
      .apply(optimizer, optimizerArgs);
  } else if (type === 'detect') {
    return Promise.resolve(detective(data));
  }
};

process.on('message', msg => {
  processMsg(msg).then(result => process.send({result}), error => process.send({error: error.message}));
});
