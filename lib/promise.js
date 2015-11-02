'use strict';

const slice = [].slice;

const promisify = (fn, ctx) => {
  return function() {
    const args = slice.call(arguments);
    return new Promise((resolve, reject) => {
      args.push((error, data) => {
        if (error != null) reject(error);
        else resolve(data);
      });
      fn.apply(this, args);
    });
  };
};

exports.promisify = promisify;
