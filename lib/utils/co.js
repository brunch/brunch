'use strict';
const isGenFun = fn => {
  return typeof fn === 'function' &&
    fn[Symbol.toStringTag] === 'GeneratorFunction';
};

const co = fn => function(...args) {
  return new Promise((resolve, reject) => {
    const gen = fn.apply(this, args);
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

const patchMethods = obj => {
  Object.getOwnPropertyNames(obj)
    .filter(key => key.endsWith('__async__'))
    .forEach(key => {
      const val = obj[key];
      if (isGenFun(val)) obj[key] = co(val);
    });
};

module.exports = obj => {
  if (isGenFun(obj)) return co(obj);

  patchMethods(obj);

  if (typeof obj === 'function' && obj.prototype) {
    patchMethods(obj.prototype);
  }

  return obj;
};
