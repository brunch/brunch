'use strict';
const sysPath = require('universal-path');
const pify = require('pify');
const fs = pify(require('fs'));
const mkdirp = pify(require('mkdirp'));
const deepAssign = require('./deep-assign');

const deepFreeze = obj => {
  for (const val of Object.values(obj)) {
    if (val instanceof RegExp) continue;
    if (!Object.isFrozen(val)) deepFreeze(val);
  }

  return Object.freeze(obj);
};

exports.isSymlink = path => {
  return fs.lstat(path).then(stat => stat.isSymbolicLink(), () => false);
};

exports.asyncFilter = (arr, fn) => {
  const promises = arr.map((item, index) => fn(item).then(result => [item, result]));
  return Promise.all(promises).then(data => {
    return data.filter(x => x[1]).map(x => x[0]);
  });
};

exports.asyncReduce = (arr, fn, init) => {
  return arr.reduce((promise, item) => {
    return promise.then(fn(item));
  }, Promise.resolve(init));
};

exports.FrozenMap = class extends Map {
  set(key) {
    throw new TypeError(`Can't set property '${key}', map is not extensible`);
  }
};

exports.FrozenSet = class extends Set {
  add(val) {
    throw new TypeError(`Can't add value '${val}', set is not extensible`);
  }
};

exports.pull = (array, fn) => {
  const index = array.findIndex(fn);
  if (index !== -1) {
    const [item] = array.splice(index, 1);
    return item;
  }
};

// Returns all parent directories:
// < parentDirs('app/assets/thing/index.html')
// > ['app/', 'app/assets/', 'app/assets/thing/']
exports.parentDirs = path => {
  return path.split('/').map((part, index, parts) => {
    return parts.slice(0, index).concat(part, '').join('/');
  }).slice(0, -1);
};

// Writes data into a file.
// Creates the file and/or all parent directories if they don't exist.
// Returns a promise (not valued if success).
exports.writeFile = (path, data) => {
  const dir = sysPath.dirname(path);
  const mode = 0o755; // -rwxr-xr-x

  return mkdirp(dir, {mode}).then(() => {
    return fs.writeFile(path, data, {mode});
  });
};

exports.readonly = (target, props) => {
  Object.keys(props).forEach(key => {
    Object.defineProperty(target, key, {
      value: props[key],
      enumerable: true,
      configurable: true,
    });
  });
};

exports.flat = iter => [].concat(...iter);
exports.uniq = iter => [...new Set(iter)];
exports.toArr = val => val == null ? [] : [].concat(val);

exports.debounce = (fn, ms) => {
  let id;

  return function(...args) {
    clearTimeout(id);

    id = setTimeout(() => {
      fn.apply(this, args);
    }, ms);
  };
};

exports.removeFrom = (arr, vals = []) => {
  for (const val of vals) {
    const index = arr.indexOf(val);
    if (index !== -1) arr.splice(index, 1);
  }

  return arr;
};

exports.pifyHook = obj => {
  const fn = obj.preCompile;
  if (!fn.length) return;

  obj.preCompile = () => new Promise(res => {
    fn.call(obj, res);
  });
};

exports.jsonToData = json => {
  const base64 = Buffer.from(JSON.stringify(json)).toString('base64');

  return `data:application/json;charset=utf-8;base64,${base64}`;
};

Object.assign(exports, {
  fs,
  deepAssign,
  deepFreeze,
});
