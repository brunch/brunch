// const sysPath = require('path');
// const {EventEmitter} = require('events');
// let threads;
// try {
//   threads = require('worker_threads');
// } finally {}
// exports.enabled = true;

// // 1. no workers
// //   main => processFile(file) =>
// // 2. workers
// //   main => processFile(file) =>
// //     pool.determineWorker(file) =>
// //     worker.postMessage(file) =>
// //     parentPort.postMessage(processed)
// // TODO:
// // this.workers = await WorkerPool.create(application.stripOpts(options));
// class WorkerPool extends EventEmitter {
//   // static instance;
//   /**
//    * @returns {Promise}
//    */
//   static schedule(args) {
//     if (!WorkerPool.instance) {
//       throw new Error('No worker pool');
//     }
//     return WorkerPool.instance.schedule(args);
//   }

//   static create(options) {
//     return new Promise(resolve => {
//       const pool = new WorkerPool(options);
//       pool.once('ready', () => {
//         resolve(pool);
//       });
//     })
//   }

//   constructor(options) {
//     super();

//     WorkerPool.instance = this;

//     if (!threads) {
//       throw new Error('Workers are not supported');
//     }
//     const { Worker } = threads;

//     const data = {workerData: {options}};

//     this.counter = 0;
//     this.workers = [];
//     const count = 6 || require('os').cpus().length;
//     this.workersToInit = count - 1;

//     const file = sysPath.join(__dirname, 'listen.js');
//     for (let i = 0; i < count - 1; i++) {
//       this.workers.push(new Worker(file, data));
//     }
//     for (let worker of this.workers) {
//       worker.on('message', msg => this.handleWorkerMessage(msg));
//       worker.on('error', err => { throw err; });
//       worker.on('exit', () => {
//         this.workers.splice(this.workers.indexOf(worker), 1);
//       });
//     }
//   }

//   handleWorkerMessage(msg) {
//     if (msg === 'ready') {
//       this.workersToInit--;
//       if (this.workersToInit === 0) {
//         this.emit('ready');
//       }
//       return;
//     }
//     this.emit(msg.id, msg.result);
//   }

//   schedule(args) {
//     const counter = this.counter++;
//     const worker = this.workers[counter % this.workers.length];
//     const id = counter.toString();
//     worker.postMessage({type: 'compile', id, args});
//     return new Promise(resolve => {
//       this.once(id, resolve);
//     });
//   }

//   async dispose() {
//     await Promise.all(this.workers.map(t => t.terminate()));
//   }
// }
// WorkerPool.instance = undefined;

// if (threads && !threads.isMainThread) {
//   async function initWorker() {
//     const {isMainThread, parentPort, workerData} = require('worker_threads');
//     const application = require('../utils/config');
//     const pipeline = require('../fs_utils/pipeline');
//     const {options} = workerData;
//     options.fromWorker = true;
//     const [cfg, {plugins}] = await application.loadConfigAndPlugins(options);
//     pipeline.setPlugins(plugins, cfg.npm.compilers);

//     parentPort.on('message', async ({type, id, args}) => {
//       if (type === 'compile') {
//         const result = await pipeline.processFile(args[0], args[1]);
//         parentPort.postMessage({type, id, result});
//       }
//     });
//     parentPort.postMessage('ready');
//   }
//   initWorker();
// }

// module.exports = WorkerPool;
