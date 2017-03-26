'use strict';
const sysPath = require('universal-path');
const pify = require('pify');
const fs = pify(require('fs'));
const mkdirp = pify(require('mkdirp'));

const deepAssign = (target, source, filter) => {
  const shouldMerge = typeof filter === 'function' &&
    filter(target, source) ||
    (() => true);

  Object.keys(source).forEach(key => {
    const value = source[key];
    if (value === Object(value) && shouldMerge(key, value)) {
      let nested = target[key];
      if (nested == null) nested = target[key] = {};
      deepAssign(nested, value, filter);
    } else {
      target[key] = value;
    }
  });

  return target;
};

const deepFreeze = (object, except = []) => {
  for (const key of Object.keys(object)) {
    if (except.includes(key)) continue;

    const value = object[key];
    if (value instanceof RegExp) continue;
    if (!Object.isFrozen(value)) {
      deepFreeze(value, except);
    }
  }

  return Object.freeze(object);
};

exports.fileExists = path => {
  return fs.access(path).then(() => true, () => false);
};

exports.isSymlink = path => {
  return fs.lstat(path).then(stat => stat.isSymbolicLink(), () => false);
};

exports.asyncFilter = (arr, fn) => {
  const promises = arr.map(item => fn(item).then(result => [item, result]));
  return Promise.all(promises).then(data => {
    return data.filter(x => x[1]).map(x => x[0]);
  });
};

exports.promiseReduce = (array, callback, initial) => {
  return array.reduce((promise, item) => {
    return promise.then(callback(item));
  }, Promise.resolve(initial));
};

exports.FrozenMap = class extends Map {
  set(key) {
    throw new TypeError(`Can't set property '${key}', map is not extensible`);
  }
};

exports.FrozenSet = class extends Set {
  add(value) {
    throw new TypeError(`Can't add value '${value}', set is not extensible`);
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

exports.flatten = array => [].concat(...array);

exports.debounce = (fn, ms) => {
  let id

  return function(...args) {
    clearTimeout(id);

    id = setTimeout(() => {
      fn.apply(this, args);
    }, ms);
  };
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
