'use strict';
const getBasename = require('./path').basename;
const SourceNode = require('source-map').SourceNode;
const promisify = require('micro-promisify');
const logger = require('loggy');

exports.isWindows = require('os').platform() === 'win32';

// Single-level flatten.
exports.flatten = (array) => [].concat.apply([], array);

exports.promisifyPlugin = (arity, fn) => fn.length === arity ? fn : promisify(fn);

exports.safePromise = (promise, intervalTime, timeoutMessage) => {
  const warn = setInterval(() => {
    logger.warn(timeoutMessage);
  }, intervalTime);

  return promise.then(value => {
    clearInterval(warn);
    return value;
  }, reason => {
    clearInterval(warn);
    throw reason;
  });
};

const deepAssign = exports.deepAssign = (target, source, filter) => {
  const shouldMerge = typeof filter === 'function'
    && filter(target, source)
    || (() => true);

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

exports.callPlugin = (plugin, fn, arity, args, msg) => {
  const promise = exports.promisifyPlugin(arity, fn).apply(plugin, args);
  if (!msg) msg = 'process';

  const warningLogInterval = 15000;

  return exports.safePromise(promise, warningLogInterval,
    `${plugin.constructor.name} is taking too long to ${msg}`
  );
};

exports.asyncFilter = (arr, fn) => {
  const promises = arr.map(item => fn(item).then(result => [item, result]));
  return Promise.all(promises).then(data => {
    return data.filter(x => x[1]).map(x => x[0]);
  });
};


exports.prettify = (object) => {
  return Object.entries(object).map(pair => pair.join('=')).join(' ');
};

exports.identityNode = (code, source) => {
  return new SourceNode(1, 0, null, code.split('\n').map((line, index) => {
    return new SourceNode(index + 1, 0, source, line + '\n');
  }));
};

exports.formatError = (error, path) => {
  const text = error.toString().slice(7);
  return `${error.code} of ${path} failed. ${text}`;
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
exports.generateCompilationLog = (startTime, allAssets, generatedFiles, disposedFiles) => {
  const getName = file => getBasename(file.path);
  const copied = allAssets.filter(a => a.copyTime > startTime).map(getName);
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

exports.getCompilationProgress = (timePassed, logger) => {
  if (!timePassed) timePassed = 0;
  let iterations = 0;
  let timeout;
  let initRunIn = timePassed ?
    animationLogInterval - timePassed :
    animationLogInterval;
  if (initRunIn < 0) initRunIn = 0;

  const writeWithDots = () => {
    const msg = iterations === 7 ? 'still compiling' : 'compiling';
    const line = msg + '...'.slice(0, iterations % 4);
    logger(line);
    iterations++;
    timeout = setTimeout(writeWithDots, animationLogInterval);
  };

  timeout = setTimeout(writeWithDots, initRunIn);
  return () => clearTimeout(timeout);
};

const deepFreeze = exports.deepFreeze = (object, except) => {
  Object.entries(Object.freeze(object))
    .filter(entry => {
      const key = entry[0];
      if (except && except.includes(key)) return false;
      return !Object.isFrozen(entry[1]);
    })
    .forEach(entry => deepFreeze(entry[1], except));
  return object;
};
