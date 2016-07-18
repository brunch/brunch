'use strict';
const fork = require('child_process').fork;
const EventEmitter = require('events');
const debug = require('debug')('brunch:workers');

const workerFile = `${__dirname}/job-processor.js`;

const genId = (() => {
  let counter = 0;

  return () => counter++;
})();

class Queue {
  constructor() {
    this._q = [];
  }

  enqueue(item) {
    this._q.push(item);
  }

  dequeue() {
    return this._q.shift();
  }
}

class WorkerManager {
  constructor(persistent, options, config) {
    this.jobs = new Queue();
    this.workers = [];
    this.pending = {};
    this.events = new EventEmitter();
    this.options = options;
    this.config = config;

    let num = options.jobs;
    debug(`Spinning ${num} workers`);
    while (num--) this.fork();
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
        debug(`Worker ${idx} spawned`);
        pending[idx] = false;
      } else {
        const id = pending[idx];
        pending[idx] = false;
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
    this.jobs.enqueue([id, {type, data}]);

    return new Promise((resolve, reject) => {
      this.events.once(id, response => {
        if ('result' in response) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  get freeWorkerIdx() {
    return Object.keys(this.workers).find(idx => this.pending[idx] === false);
  }

  sendMessage() {
    const workerIdx = this.freeWorkerIdx;
    if (!workerIdx) return;
    const job = this.jobs.dequeue();
    if (!job) return;
    const worker = this.workers[workerIdx];

    const id = job[0];
    const data = job[1];

    this.pending[workerIdx] = id;
    worker.send(data);
  }
}

module.exports = WorkerManager;
