'use strict';
const basename = require('universal-path').basename;
const promisify = require('micro-promisify');
const fslstat = promisify(require('fs').lstat);
const fsaccess = promisify(require('fs').access);

// Single-level flatten.
const flatten = array => [].concat.apply([], array);

const deepAssign = (target, source, filter) => {
  const shouldMerge = typeof filter === 'function' &&
    filter(target, source) ||
    (() => true);

  Object.keys(source).forEach(key => {
    const value = source[key];
    const isObject = toString.call(value) === '[object Object]';
    if (isObject && shouldMerge(key, value)) {
      let nested = target[key];
      if (nested == null) nested = target[key] = {};
      deepAssign(nested, value, filter);
    } else {
      target[key] = value;
    }
  });

  return target;
};

const asyncFilter = (arr, fn) => {
  const promises = arr.map(item => fn(item).then(result => [item, result]));
  return Promise.all(promises).then(data => {
    return data.filter(x => x[1]).map(x => x[0]);
  });
};

const prettify = object => {
  return Object.entries(object).map(pair => pair.join('=')).join(' ');
};

const getFormattedError = (err, code, path) => {
  let error;
  if (typeof err === 'string') {
    error = new Error(err);
  } else {
    error = new Error(err.toString());
    ['stack', 'line', 'col'].filter(n => n in err).forEach(n => {
      error[n] = err[n];
    });
  }
  const message = error.message.trim().replace(/^/gm, '   ').trim();
  let details = '';
  if ('line' in error) {
    details += ` at L${error.line}`;
    if ('col' in error) details += `-${error.col}`;
  }
  error.message = `${code || 'Processing'} of ${path} failed${details}. ${message}`;
  return error;
};

const formatError = file => {
  return getFormattedError(file.error, file.error.pipelineCode, file.path);
};

const formatOptimizerError = (error, path) => {
  return getFormattedError(error, 'Optimizing', path);
};

/* compiled 4 files and 145 cached files into app.js
 * compiled app.js and 10 cached files into app.js, copied 2 files
 * `compiled 106 into 3 and copied 47 files` - initial compilation
 * `copied img.png` - 1 new/changed asset
 * `copied 6 files` - >1 new/changed asset
 * `compiled controller.coffee and 32 cached files into app.js`
 * `compiled _partial.styl and 22 cached into 2 files` - 1 partial affecting
 *                                                      >1 compiled file
 * `compiled init.ls into init.js` - 1 source file that doesn't
 *                                   concat with any other files
 * `compiled 5 files into ie7.css` - source files that go into 1 compiled
 * `compiled 2 and 3 cached files into ie7.css` - change some source files
 *                                                that go into 1 compiled
 * `compiled 4 files and 1 cached into ie7.css` - one cached should not
 *                                                switch to filename
 * `compiled 5 and 101 cached into 3 files` - change >1 affecting >1 compiled
 */
const generateCompilationLog = (startTime, copiedAssets, generatedFiles, disposedFiles) => {
  const getName = file => basename(file.path);
  const copied = copiedAssets.map(getName);
  const generated = [];
  const compiled = [];
  let cachedCount = 0;
  const dgen = disposedFiles.generated;
  generatedFiles.forEach(generatedFile => {
    let isChanged = false;
    let locallyCompiledCount = 0;
    const len = generatedFile.sourceFiles.length;
    generatedFile.sourceFiles.forEach(sourceFile => {
      if (sourceFile.compilationTime >= startTime) {
        isChanged = true;
        locallyCompiledCount++;
        const sourceName = getName(sourceFile);
        if (!compiled.includes(sourceName)) {
          compiled.push(sourceName);
        }
      }
      if (!isChanged && dgen.includes(generatedFile)) isChanged = true;
    });
    if (isChanged) {
      generated.push(getName(generatedFile));
      cachedCount += len - locallyCompiledCount;
    }
  });
  const disposed = disposedFiles.sourcePaths;
  const generatedLog = (() => {
    switch (generated.length) {
      case 0: return '';
      case 1: return ` into ${generated}`;
    }
    return ` into ${generated.length} files`;
  })();
  const compiledLog = (() => {
    switch (compiled.length) {
      case 0:
        switch (disposed.length) {
          case 0: return '';
          case 1: return `removed ${disposed}`;
        }
        return `removed ${disposed.length}`;
      case 1:
        return `compiled ${compiled}`;
    }
    return `compiled ${compiled.length}`;
  })();
  const cachedLog = (() => {
    if (cachedCount === 0) return compiled.length <= 1 ? '' : ' files';

    switch (compiled.length) {
      case 0:
        const noun = generated.length > 1 ? '' : ' files';
        return ` and wrote ${cachedCount} cached${noun}`;
      case 1:
        const cachedCountName = `file${cachedCount === 1 ? '' : 's'}`;
        return ` and ${cachedCount} cached ${cachedCountName}`;
    }
    return ` files and ${cachedCount} cached`;
  })();
  const nonAssetsLog = compiledLog + cachedLog + generatedLog;
  const sep = nonAssetsLog && copied.length ? ', ' : '';
  const assetsLog = (() => {
    switch (copied.length) {
      case 0: return '';
      case 1: return `copied ${copied}`;
    }
    return compiled.length ?
      `copied ${copied.length}` :
      `copied ${copied.length} files`;
  })();
  const main = nonAssetsLog + sep + assetsLog;
  const diff = Date.now() - startTime;
  const oneSecond = 1000;
  const diffText = diff > oneSecond ?
    `${(diff / oneSecond).toFixed(1)} sec` :
    `${diff} ms`;
  return `${main || 'compiled'} in ${diffText}`;
};

const animationLogInterval = 4000;

const getCompilationProgress = (timePassed, logger) => {
  if (!timePassed) timePassed = 0;
  let iterations = 0;
  let timeout;
  let initRunIn = timePassed ?
    animationLogInterval - timePassed :
    animationLogInterval;
  if (initRunIn < 0) initRunIn = 0;

  const writeWithDots = () => {
    const msg = iterations === 7 ? 'still compiling' : 'compiling';
    const line = msg + '.'.repeat(iterations % 4);
    logger(line);
    iterations++;
    timeout = setTimeout(writeWithDots, animationLogInterval);
  };

  timeout = setTimeout(writeWithDots, initRunIn);
  return () => clearTimeout(timeout);
};

const deepFreeze = (object, except) => {
  Object.freeze(object);

  for (const key of Object.keys(object)) {
    if (except && except.includes(key)) continue;

    const value = object[key];
    if (value instanceof RegExp) continue;
    if (!Object.isFrozen(value)) {
      deepFreeze(value, except);
    }
  }

  return object;
};

const fsExists = path => {
  return fsaccess(path).then(() => true, () => false);
};

const isSymlink = path => {
  return fslstat(path).then(stat => stat.isSymbolicLink(), () => false);
};

const promiseReduce = (array, callback, initial) => {
  return array.reduce((promise, item) => {
    return promise.then(callback(item));
  }, Promise.resolve(initial));
};

class FrozenMap extends Map {
  set(key) {
    throw new TypeError(`Can't set property '${key}', map is not extensible`);
  }
}

class FrozenSet extends Set {
  add(value) {
    throw new TypeError(`Can't add value '${value}', set is not extensible`);
  }
}

const pull = (array, is) => {
  const index = array.findIndex(is);
  if (index === -1) return;

  const item = array[index];
  array.splice(index, 1);
  return item;
};

module.exports = {
  flatten,
  deepAssign,
  asyncFilter,
  prettify,
  formatError,
  formatOptimizerError,
  generateCompilationLog,
  getCompilationProgress,
  deepFreeze,
  fsExists,
  isSymlink,
  promiseReduce,
  FrozenMap,
  FrozenSet,
  pull,
};
