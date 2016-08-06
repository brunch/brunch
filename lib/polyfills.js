'use strict';
/* eslint-disable no-extend-native */

const dontEnum = fn => {
  return {value: fn, writable: true, configurable: true};
};

if (!Object.values) {
  const values = object => {
    return Object.keys(object).map(key => object[key]);
  };

  const entries = object => {
    return Object.keys(object).map(key => [key, object[key]]);
  };

  Object.defineProperties(Object, {
    values: dontEnum(values),
    entries: dontEnum(entries)
  });
}

if (![].includes) {
  const includes = function(search) {
    const array = arguments.length > 1 ? [].slice.call(this, arguments[1]) : this;
    const is = Number.isNaN(search) ? Number.isNaN : el => el === search;
    return [].findIndex.call(array, is) !== -1;
  };
  Object.defineProperty(Array.prototype, 'includes', dontEnum(includes));
}

// https://bugs.chromium.org/p/v8/issues/detail?id=5059
[][Symbol.unscopables].includes = true;
