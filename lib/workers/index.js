'use strict';
const WorkerManager = require('./manager');

let manager;

/*
 * A job is described by:
 *
 * - `serialize`, which takes some hash and produces a hash to be sent as JSON (always executed in main process);
 * - `deserialize`, which takes the hash from the step above and should produce the original hash passed to serialize (always executed in worker process). To aid reconstructing original hash, ctx is passed (which contains all loaded plugins; we needed it to select appropriate plugins for a given file to compile)
 * - `work`: actually perform the work, can be called in both master and worker.
 */

// Schedule a job for processing. If workers are enabled, will schedule that.
// Otherwise, just run the work function.
exports.processJob = (job, hash) => {
  if (manager) {
    return manager.schedule(job.path, {hash: job.serialize(hash)});
  }
  return job.work(hash);
};

exports.init = (persistent, options, cfg) => {
  manager = new WorkerManager(persistent, options, cfg);
};

exports.close = () => {
  if (manager) {
    manager.close();
    manager = null;
  }
};
