'use strict';
require('micro-es7-shim');
require('promise.prototype.finally').shim();
const loadConfigWorker = require('../utils/config').loadConfigWorker;
const initPlugins = require('../utils/plugins');
const mediator = require('./mediator');
const jobs = require('./jobs');


const options = JSON.parse(process.env.BRUNCH_OPTIONS);
loadConfigWorker(false, options).then(_cfg => {
  mediator.config = _cfg;
  return initPlugins(_cfg).then(_plugins => {
    mediator.plugins = _plugins.plugins;
    process.send('ready');
  });
});

process.on('message', msg => {
  const type = msg.type;
  const data = msg.data;

  const job = jobs[type];
  if (!job) console.error('INVALID_JOB_TYPE', type);
  const deserialized = job.deserialize(mediator, data.hash);
  job.work(deserialized).then(result => {
    process.send({result});
  }, error => {
    const err = typeof error === 'string' ? new Error(error) : error;
    const data = {error: err.message};
    ['stack', 'line', 'col'].filter(n => n in err).forEach(n => data[n] = err[n]);
    process.send(data);
  });
});
