'use strict';
// const workers = [];
// const cluster = require('cluster');

exports.job = (id, fn) => {
  return fn;

  // if (cluster.isWorker) {
  //   console.log('WORKER', id);
  //   return Promise.reject();
  // }

  // console.log('MASTER', id);

  // return (...args) => fn(...args).then(d => {
  //   return new Promise(r => setTimeout(r, 3000)).then(() => d);
  // });
};

exports.spin = jobs => {
  return jobs;

  // if (cluster.isWorker) return;

  // while (jobs--) {
  //   const worker = cluster.fork();
  //   workers.push(worker);
  // }
};
