'use strict';
const norm = require('../../lib/config');
const makeProxy = keys => {
  return new Proxy(val => {
    if (!keys.length) return norm(val);

    const cfg = {};
    const lastObj = keys
      .slice(0, -1)
      .reduce((obj, key) => obj[key] = {}, cfg);

    const [lastKey] = keys.slice(-1);
    lastObj[lastKey] = val;

    return keys.reduce(
      (obj, key) => obj[key],
      norm(cfg)
    );
  }, {
    get: (_, key) => makeProxy(keys.concat(key)),
  });
};

module.exports = makeProxy([]);
