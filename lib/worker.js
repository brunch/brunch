'use strict';
const cluster = require('cluster');
const sysPath = require('path');
const numCPUs = require('os').cpus().length;
const debug = require('debug')('brunch:worker');
const pipeline = require('./fs_utils/pipeline');
let workers = undefined;

/* monkey-patch pipeline and override on master process */
const origPipeline = pipeline.pipeline;

pipeline.pipeline = (path, linters, compilers) => {
  const cfg = workers && workers.config;
  const exts = cfg && cfg.extensions;
  const ext = sysPath.extname(path).slice(1);
  if (workers && (!exts || exts.indexOf(ext) >= 0)) {
    debug(`Worker compilation of ${path}`);
    return workers.queue(path, arg => {
      const msg = arg[0];
      msg.compiled = msg.data;
      if (msg.error) return Promise.reject(msg.error);
      return Promise.resolve(msg);
    });
  } else {
    return origPipeline(path, linters, compilers);
  }
};


/* method invoked on worker processes */

const initWorker = arg => {
  const changeFileList = arg.changeFileList;
  const compilers = arg.compilers;
  const linters = arg.linters;
  const fileList = arg.fileList;
  fileList.on('compiled', path => {
    const filtered = fileList.files.filter(f => f.path === path);
    return process.send(filtered);
  });
  return process.on('message', arg1 => {
    const path = arg1.path;
    if (path) return changeFileList(compilers, linters, fileList, path);
  }).send('ready');
};


// BrunchWorkers class invoked in the master process
// for wrangling all the workers.

class BrunchWorkers {
  constructor(config1) {
    this.config = config1 != null ? config1 : {};
    let counter = this.count = this.config.count || numCPUs - 1;
    this.workerIndex = this.count - 1;
    this.jobs = [];
    this.list = [];
    while (counter--) {
      this.fork(this.list, this.work.bind(this));
    }
  }

  fork(list, work) {
    return cluster.fork().on('message', msg => {
      if (msg === 'ready') {
        this.handlers = {};
        list.push(this);
        return work();
      } else if (msg && msg[0] && msg[0].path) {
        return this.handlers[msg[0].path](msg);
      }
    });
  }

  queue(path, handler) {
    this.jobs.push({
      path: path,
      handler: handler
    });
    return this.work();
  }

  work() {
    const activeWorkers = this.list.length;
    if (!activeWorkers) {
      return;
    }
    if (activeWorkers < this.count) {
      if (this.jobs.length) {
        return this.next(activeWorkers - 1);
      }
    } else {
      const results = [];
      while (this.jobs.length) {
        this.next(this.workerIndex);
        if (++this.workerIndex === this.count) {
          results.push(this.workerIndex = 0);
        } else {
          results.push(undefined);
        }
      }
      return results;
    }
  }

  next(index) {
    const job = this.jobs.shift();
    const path = job.path;
    const handler = job.handler;
    this.list[index].handlers[path] = handler;
    return this.list[index].send({path: path});
  }
}

const brunchWorker = arg => {
  const changeFileList = arg.changeFileList;
  const compilers = arg.compilers;
  const linters = arg.linters;
  const fileList = arg.fileList;
  const config = arg.config;
  if (cluster.isWorker) {
    debug('Worker started');
    initWorker({
      changeFileList: changeFileList,
      compilers: compilers,
      linters: linters,
      fileList: fileList
    });
    return undefined;
  } else {
    return workers = new BrunchWorkers(config.workers);
  }
};

module.exports = brunchWorker;
module.exports.isWorker = cluster.isWorker;
module.exports.close = cluster.disconnect;
