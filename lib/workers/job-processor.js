'use strict';
const loadConfigWorker = require('../config').loadConfigWorker;
const initPlugins = require('../plugins').init;

let cfg, plugins; // eslint-disable-line prefer-const

const options = JSON.parse(process.env.BRUNCH_OPTIONS);
loadConfigWorker(false, options).then(_cfg => {
  cfg = _cfg;
  return initPlugins(cfg, () => {}).then(_plugins => {
    plugins = _plugins;
    process.send('ready');
  });
});

const OptimizeJob = require('../fs_utils/generate').OptimizeJob;
const CompileJob = require('../fs_utils/pipeline').CompileJob;

const jobs = {OptimizeJob, CompileJob};

process.on('message', msg => {
  const type = msg.type;
  const data = msg.data;

  const job = jobs[type];
  const hash = job.deserialize({plugins}, data.hash);
  job.work(hash).then(result => process.send({result}),
    error => process.send({error: error.message})
  );
});
