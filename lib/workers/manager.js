'use strict';
const fork = require('child_process').fork;
const EventEmitter = require('events');
const debug = require('debug')('brunch:workers');

const workerFile = `${__dirname}/job-processor.js`;

const genId = (() => {
  let counter = 0;

  return () => counter++;
})();

class WorkerManager {
  constructor(options, config) {
    this.jobs = [];
    this.workers = [];
    this.pending = {};
    this.events = new EventEmitter();
    this.options = options;
    this.config = config;

    let jobs = options.jobs;
    this.freeWorkers = 0;
    debug(`Spinning ${jobs} workers`);
    while (jobs--) this.fork();
    this._checker = setInterval(() => this.sendMessage());
  }

  fork() {
    const list = this.workers;
    const pending = this.pending;
    // remove the circular reference in parsed options
    const options = Object.assign({}, this.options, {parent: null});
    // pass parsed options to not make each worker parse the options
    const workerEnv = {BRUNCH_OPTIONS: JSON.stringify(options)};
    const env = Object.assign({}, process.env, workerEnv);
    const worker = fork(workerFile, {env});
    const events = this.events;
    let idx;
    worker.on('message', msg => {
      if (msg === 'ready') {
        list.push(worker);
        idx = list.indexOf(worker);
        debug(`Worker #${idx} spawned`);
        this.freeWorkers += 1;
        pending[idx] = false;
      } else {
        const id = pending[idx];
        pending[idx] = false;
        debug(`Worker #${idx} free`)
        this.freeWorkers += 1;
        events.emit(id, msg);
      }
    });
  }

  close() {
    debug('Killing workers');
    clearInterval(this._checker);
    this.workers.forEach(worker => worker.kill('SIGINT'));
  }

  // schedule a `type` operation with `data` for processing
  // returns a promise which will yield the results of the computation
  schedule(type, data) {
    const id = genId();
    this.jobs.push([id, {type, data}]);
    debug(`Scheduling task #${this.jobs.length}`);

    return new Promise((resolve, reject) => {
      this.events.once(id, response => {
        if ('result' in response) {
          console.log(`    Job <= ${type} ${Date.now()} ${response.result.data.length}`)
          resolve(response.result);
        } else {
          const error = new Error(response.error);
          if (response.stack) {
            error.stack = `\nWorker ${response.stack}\n\nMain thread ${error.stack}`;
          }
          ['line', 'col'].forEach(n => error[n] = response[n]);
          reject(error);
        }
      });
    });
  }

  getFreeWorkerIdx() {
    if (this.freeWorkers === 0) return;
    return Object.keys(this.workers).find(idx => this.pending[idx] === false);
  }

  sendMessage() {
    if (!this.jobs.length) return;
    const workerIdx = this.getFreeWorkerIdx();
    if (workerIdx == null) return;
    const job = this.jobs.pop();
    if (!job) return;
    const worker = this.workers[workerIdx];
    this.freeWorkers -= 1;
    debug(`Worker #${workerIdx} busy`);

    const id = job[0];
    const data = job[1];

    this.pending[workerIdx] = id;
    worker.send(data);
  }
}

module.exports = WorkerManager;
