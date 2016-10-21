'use strict';
const loadConfigWorker = require('../utils/config').loadConfigWorker;
const initPlugins = require('../utils/plugins');

let cfg, plugins; // eslint-disable-line prefer-const

const options = JSON.parse(process.env.BRUNCH_OPTIONS);
loadConfigWorker(false, options).then(_cfg => {
  cfg = _cfg;
  return initPlugins(cfg).then(_plugins => {
    plugins = _plugins.plugins;
    process.send('ready');
  });
});

const OptimizeJob = require('../fs_utils/generate').OptimizeJob;
const CompileJob = require('../fs_utils/pipeline').CompileJob;
const CompileStaticJob = require('../fs_utils/pipeline').CompileStaticJob;

const jobs = {OptimizeJob, CompileJob, CompileStaticJob};

process.on('message', msg => {
  const type = msg.type;
  const data = msg.data;

  const job = jobs[type];
  if (!job) console.error('INVALID_JOB_TYPE', type);
  const hash = job.deserialize({plugins}, data.hash);
  job.work(hash).then(result => process.send({result}),
    error => process.send({error: error.message})
  );
});
