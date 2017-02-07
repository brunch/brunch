'use strict';
require('micro-es7-shim');
require('promise.prototype.finally').shim();
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
    const data = {error: err.message};
    ['stack', 'line', 'col'].filter(n => n in err).forEach(n => {
      data[n] = err[n];
    });
    process.send(data);
  });
});
