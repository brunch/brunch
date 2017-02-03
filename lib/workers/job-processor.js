'use strict';
require('micro-es7-shim');
require('promise.prototype.finally').shim();
// const debug = require('debug')('workers');
// const deppack = require('deppack');
const loadConfigWorker = require('../utils/config').loadConfigWorker;
const initPlugins = require('../utils/plugins');
const mediator = require('./mediator');
const jobs = require('./jobs');
const cleanError = require('./clean-error').clean;


const options = JSON.parse(process.env.BRUNCH_OPTIONS);
loadConfigWorker(false, options).then(_cfg => {
  mediator.config = _cfg;
  return initPlugins(_cfg).then(_plugins => {
    mediator.plugins = _plugins.plugins;

    // deppack.setPlugins(_plugins.plugins, _cfg.npm.compilers);

    process.send('ready');
  });
});

process.on('message', msg => {
  const type = msg.type;
  const data = msg.data;

  const job = jobs[type];
  const d = Date.now();
  console.log(`Job => ${type} ${d} ${data.path}`)
  if (!job) console.error('INVALID_JOB_TYPE', type);
  process.nextTick(() => {
    job(data).then(result => {
      console.log(`Job <= ${type} +${Date.now()-d}ms ${data.path}`)
      process.send({result});
    }, error => {
      console.log(`Job <! ${type} +${Date.now()-d}ms ${data.path}`)
      process.send(cleanError(error, true));
    });
  });
});
