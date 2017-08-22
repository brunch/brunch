'use strict';
const co = fn => function() {
  return new Promise((resolve, reject) => {
    const gen = fn.apply(this, arguments);
    const step = next => {
      try {
        var res = next();
        if (res.done) {
          resolve(res.value);
          return;
        }
      } catch (err) {
        reject(err);
        return;
      }

      Promise.resolve(res.value).then(val => {
        step(() => gen.next(val));
      }, err => {
        step(() => gen.throw(err));
      });
    };

    step(() => gen.next());
  });
};

module.exports = fn => {
  if (fn[Symbol.toStringTag] === 'GeneratorFunction') {
    return co(fn);
  }
};
