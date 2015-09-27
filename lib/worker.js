'use strict';
const cluster = require('cluster');
const sysPath = require('path');
const numCPUs = require('os').cpus().length;
const debug = require('debug')('brunch:worker');
const pipeline = require('./fs_utils/pipeline');
const workers = undefined;


/* monkey-patch pipeline and override on master process */

var origPipeline = pipeline.pipeline;

pipeline.pipeline = (path, linters, compilers, callback) => {
  const cfg = workers && workers.config;
  const exts = cfg && cfg.extensions;
  const ext = sysPath.extname(path).slice(1);
  if (workers && (!exts || exts.indexOf(ext) >= 0)) {
    debug("Worker compilation of " + path);
    return workers.queue(path, arg => {
      var msg;
      msg = arg[0];
      msg.compiled = msg.data;
      return callback(msg.error, msg);
    });
  } else {
    return origPipeline(path, linters, compilers, callback);
  }
};


/* method invoked on worker processes */

const initWorker = arg => {
  var changeFileList, compilers, fileList, linters;
  changeFileList = arg.changeFileList, compilers = arg.compilers, linters = arg.linters, fileList = arg.fileList;
  fileList.on('compiled', path => {
    return process.send(fileList.files.filter(_ => {
      return _.path === path;
    }));
  });
  return process.on('message', arg1 => {
    var path;
    path = arg1.path;
    if (path) {
      return changeFileList(compilers, linters, fileList, path);
    }
  }).send('ready');
};


/* BrunchWorkers class invoked in the master process for wrangling all the workers */

const BrunchWorkers = (() => {
  function BrunchWorkers(config1) {
    this.config = config1 != null ? config1 : {};
    const counter = this.count = this.config.count || numCPUs - 1;
    this.workerIndex = this.count - 1;
    this.jobs = [];
    this.list = [];
    while (counter--) {
      this.fork(this.list, this.work.bind(this));
    }
  }

  BrunchWorkers.prototype.fork = (list, work) => {
    return cluster.fork().on('message', msg => {
      if (msg === 'ready') {
        this.handlers = {};
        list.push(this);
        return work();
      } else if (msg && msg[0] && msg[0].path) {
        return this.handlers[msg[0].path](msg);
      }
    });
  };

  BrunchWorkers.prototype.queue = (path, handler) => {
    this.jobs.push({
      path: path,
      handler: handler
    });
    return this.work();
  };

  BrunchWorkers.prototype.work = () => {
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
  };

  BrunchWorkers.prototype.next = index => {
    const job = this.jobs.shift();
    const path = job.path;
    const handler = job.handler;
    this.list[index].handlers[path] = handler;
    return this.list[index].send({path: path});
  };

  return BrunchWorkers;

})();

module.exports = arg => {
  var changeFileList, compilers, config, fileList, linters;
  changeFileList = arg.changeFileList, compilers = arg.compilers, linters = arg.linters, fileList = arg.fileList, config = arg.config;
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

module.exports.isWorker = cluster.isWorker;

module.exports.close = cluster.disconnect;
