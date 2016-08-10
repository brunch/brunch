'use strict';

const install = (target, methods) => {
  Object.keys(methods).forEach(key => {
    if (target.hasOwnProperty(key)) return;
    Object.defineProperty(target, key, {
      value: methods[key],
      writable: true,
      configurable: true,
    });
  });
};

install(Array.prototype, {
  includes(search) {
    if (this.length === 0) return false;
    const array = arguments.length > 1 ? [].slice.call(this, arguments[1]) : this;
    const is = Number.isNaN(search) ? Number.isNaN : item => item === search;
    return [].findIndex.call(array, is) !== -1;
  },
});

// https://bugs.chromium.org/p/v8/issues/detail?id=5059
[][Symbol.unscopables].includes = true;

install(Object, {
  values(object) {
    return Object.keys(object).map(key => object[key]);
  },
  entries(object) {
    return Object.keys(object).map(key => [key, object[key]]);
  },
});
