'use strict';
const getBasename = require('path').basename;
const SourceNode = require('source-map').SourceNode;
const promisify = require('micro-promisify');

exports.isWindows = require('os').platform() === 'win32';

const windowsStringReplace = (search, replacement) => {
  return str => (exports.isWindows && typeof str === 'string') ?
    str.replace(search, replacement) : str;
};

// Single-level flatten.
exports.flatten = (array) => [].concat.apply([], array);

exports.promisifyPlugin = (arity, fn) => fn.length === arity ? fn : promisify(fn);
exports.replaceSlashes = windowsStringReplace(/\//g, '\\');
exports.replaceBackSlashes = windowsStringReplace(/\\/g, '\/');

exports.asyncFilter = (arr, fn) => {
  const promises = arr.map(item => fn(item).then(result => [item, result]));
  return Promise.all(promises).then(data => {
    const filtered = data.filter(x => x[1]).map(x => x[0]);
    return filtered;
  });
};


exports.prettify = (object) => {
  return Object.keys(object).map(key => `${key}=${object[key]}`).join(' ');
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
        locallyCompiledCount += 1;
        const sourceName = getName(sourceFile);
        if (compiled.indexOf(sourceName) === -1) {
          compiled.push(sourceName);
        }
      }
      if (!isChanged && dgen.indexOf(generatedFile) >= 0) isChanged = true;
    });
    if (isChanged) {
      generated.push(getName(generatedFile));
      cachedCount += len - locallyCompiledCount;
    }
  });
  const compiledCount = compiled.length;
  const copiedCount = copied.length;
  const disposedCount = disposedFiles.sourcePaths.length;
  const generatedLog = (() => {
    switch (generated.length) {
      case 0:
        return '';
      case 1:
        return ' into ' + generated[0];
      default:
        return ' into ' + generated.length + ' files';
    }
  })();
  const compiledLog = (() => {
    switch (compiledCount) {
      case 0:
        switch (disposedCount) {
          case 0:
            return '';
          case 1:
            return 'removed ' + disposedFiles.sourcePaths[0];
          default:
            return 'removed ' + disposedCount;
        }
      case 1:
        return 'compiled ' + compiled[0];
      default:
        return 'compiled ' + compiledCount;
    }
  })();
  const cachedLog = (() => {
    switch (cachedCount) {
      case 0:
        if (compiledCount <= 1) {
          return '';
        } else {
          return ' files';
        }
      default:
        switch (compiledCount) {
          case 0:
            const noun = generated.length > 1 ? '' : ' files';
            return ' and wrote ' + cachedCount + ' cached' + noun;
          case 1:
            const cachedCountName = 'file' + (cachedCount === 1 ? '' : 's');
            return ' and ' + cachedCount + ' cached ' + cachedCountName;
          default:
            return ' files and ' + cachedCount + ' cached';
        }
    }
  })();
  const nonAssetsLog = compiledLog + cachedLog + generatedLog;
  const sep = nonAssetsLog && copiedCount !== 0 ? ', ' : '';
  const assetsLog = (() => {
    switch (copiedCount) {
      case 0:
        return '';
      case 1:
        return 'copied ' + copied[0];
      default:
        if (compiled.length === 0) {
          return 'copied ' + copiedCount + ' files';
        } else {
          return 'copied ' + copiedCount;
        }
    }
  })();
  const main = nonAssetsLog + sep + assetsLog;
  const diff = Date.now() - startTime;
  const oneSecond = 1000;
  const diffText = diff > oneSecond ?
    +(diff / oneSecond).toFixed(1) + ' sec' :
    diff + 'ms';
  return (main ? main : 'compiled') + ' in ' + diffText;
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
    iterations += 1;
    timeout = setTimeout(writeWithDots, animationLogInterval);
  };

  timeout = setTimeout(writeWithDots, initRunIn);
  return () => clearTimeout(timeout);
};

