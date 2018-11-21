'use strict';
// const sysPath = require('universal-path');
const EventEmitter = require('events');
const loggy = require('loggy');
const {uniq} = require('./utils');

// const getName = file => sysPath.basename(file.path);
// const formatTime = ms => {
//   if (ms < 1000) return `${ms} ms`;

//   const sec = Math.round(ms / 100) / 10;
//   return `${sec} sec`;
// };

// `compiled 4 files and 145 cached files into app.js`
// `compiled app.js and 10 cached files into app.js, copied 2 files`
// `compiled 106 into 3 and copied 47 files` - initial compilation
// `copied img.png` - 1 new/changed asset
// `copied 6 files` - >1 new/changed asset
// `compiled controller.coffee and 32 cached files into app.js`
// `compiled _partial.styl and 22 cached files into 2 files` - 1 partial affecting >1 compiled file
// `compiled init.ls into init.js` - 1 source file that doesn't concat with any other files
// `compiled 5 files into ie7.css` - source files that go into 1 compiled
// `compiled 2 and 3 cached files into ie7.css` - change some source files that go into 1 compiled
// `compiled 4 files and 1 cached into ie7.css` - one cached should not switch to filename
// `compiled 5 and 101 cached into 3 files` - change >1 affecting >1 compiled

// compiled %NOT_CACHED files and %CACHED cached files into %GEN_FILES
// compiled %TOTAL_FILES files (%CACHED_FILES cache) into %GEN_FILES

class Logger extends EventEmitter {
  constructor() {
    super();

    this.on('start', this._start);
    this.on('end', this._end);
  }

  _start() {
    let iters = 0;

    this._startTime = Date.now();
    this._id = setInterval(() => {
      const msg = iters % 8 ? 'compiling' : 'still compiling';
      const dots = '.'.repeat(iters % 4);

      loggy.info(msg + dots);
      iters++;
    }, 4000);
  }

  _end(assets, files) {
    clearInterval(this._id);

    const sources = uniq(flat(files.map(gen => gen.sources)))

    // const generatedLog = format``
    // const assetsLog = format`copied ${}`


    // const copied = copiedAssets.map(getName);
    // const generated = [];
    // const compiled = [];
    // let cachedCount = 0;
    // const dgen = disposedFiles.generated;
    // generatedFiles.forEach(generatedFile => {
    //   let isChanged = false;
    //   let locallyCompiledCount = 0;
    //   const len = generatedFile.sourceFiles.length;
    //   generatedFile.sourceFiles.forEach(sourceFile => {
    //     if (sourceFile.compilationTime >= startTime) {
    //       isChanged = true;
    //       locallyCompiledCount++;
    //       const sourceName = getName(sourceFile);
    //       if (!compiled.includes(sourceName)) {
    //         compiled.push(sourceName);
    //       }
    //     }
    //     if (!isChanged && dgen.includes(generatedFile)) isChanged = true;
    //   });
    //   if (isChanged) {
    //     generated.push(getName(generatedFile));
    //     cachedCount += len - locallyCompiledCount;
    //   }
    // });
    // const disposed = disposedFiles.sourcePaths;
    // const compiledLog = (() => {
    //   switch (compiled.length) {
    //     case 0:
    //       switch (disposed.length) {
    //         case 0: return '';
    //         case 1: return `removed ${disposed}`;
    //       }
    //       return `removed ${disposed.length}`;
    //     case 1:
    //       return `compiled ${compiled}`;
    //   }
    //   return `compiled ${compiled.length}`;
    // })();
    // const cachedLog = (() => {
    //   if (cachedCount === 0) return compiled.length <= 1 ? '' : ' files';
    //   switch (compiled.length) {
    //     case 0:
    //       const noun = generated.length > 1 ? '' : ' files';
    //       return ` and wrote ${cachedCount} cached${noun}`;
    //     case 1:
    //       const cachedCountName = `file${cachedCount === 1 ? '' : 's'}`;
    //       return ` and ${cachedCount} cached ${cachedCountName}`;
    //   }
    //   return ` files and ${cachedCount} cached`;
    // })();
    // const generatedLog = (() => {
    //   switch (generated.length) {
    //     case 0: return '';
    //     case 1: return ` into ${generated}`;
    //   }
    //   return ` into ${generated.length} files`;
    // })();
    // const nonAssetsLog = compiledLog + cachedLog + generatedLog;
    // const sep = nonAssetsLog && copied.length ? ', ' : '';
    // const assetsLog = (() => {
    //   switch (copied.length) {
    //     case 0: return '';
    //     case 1: return `copied ${copied}`;
    //   }
    //   return compiled.length ?
    //     `copied ${copied.length}` :
    //     `copied ${copied.length} files`;
    // })();

    // const main = nonAssetsLog + sep + assetsLog; // sep sucks
    // const diff = formatTime(Date.now() - this._startTime);

    // loggy.info(`${main || 'compiled'} in ${diff}`);
  }
}

module.exports = Logger;
