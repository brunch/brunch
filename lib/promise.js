'use strict';

const promisify = (fn, ctx) => {
  return function() {
    const args = [].slice.call(arguments);
    return new Promise((resolve, reject) => {
      args.push((error, data) => {
        if (error != null) return reject(error);
        resolve(data);
      });
      fn.apply(this, args);
    });
  };
};

module.exports.promisify = promisify;