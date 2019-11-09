'use strict';
const {loadConfig} = require('../utils/config');
const initPlugins = require('../utils/plugins');

let cfg, plugins; // eslint-disable-line prefer-const

const options = JSON.parse(process.env.BRUNCH_OPTIONS);
loadConfig({...options, fromWorker: true}).then(_cfg => {
  cfg = _cfg;
  return initPlugins(cfg).then(_plugins => {
    plugins = _plugins.plugins;
    process.send('ready');
  });
});

const jobs = require('./jobs');

process.on('message', msg => {
  const type = msg.type;
  const data = msg.data;

  const job = jobs[type];
  if (!job) console.error('INVALID_JOB_TYPE', type);
  const hash = job.deserialize({plugins}, data.hash);
  job.work(hash).then(result => {
    process.send({result});
  }, error => {
    const err = typeof error === 'string' ? new Error(error) : error;
    const data = {error: err.message, stack: err.stack};
    process.send(data);
  });
});
