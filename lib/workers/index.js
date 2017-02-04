'use strict';

exports.isWorker = process.env.BRUNCH_WORKER === 'true';
exports.threaded = (id, fn) => {
  return fn;
};
