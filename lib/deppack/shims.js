'use strict';

const nodeMods = require('node-browser-modules');

const emptyShims = nodeMods.emptyShims;
const fileShims = nodeMods.fileShims;

const fileShimPaths = Object.keys(fileShims).map(x => fileShims[x]);

const shims = emptyShims.reduce((memo, el) => {
  memo[el] = {};
  return memo;
}, {});

const specialShimFile = '___shims___';

const makeSpecialShimFname = shim => specialShimFile + '/' + shim;

const isSimpleShim = x => x.indexOf(specialShimFile) === 0;
const isFileShim = x => fileShimPaths.indexOf(x) !== -1;
const isShim = x => isSimpleShim(x) || isFileShim(x);

const actualShimName = x => {
  if (x.indexOf(specialShimFile) === 0) {
    return x.slice(specialShimFile.length + 1);
  } else {
    return Object.keys(fileShims).find(y => fileShims[y] === x);
  }
};

const shouldOverrideModuleName = name => name === 'stream-browserify';
const overrideModuleName = () => 'stream';

const shouldIncludeFileBasedAlias = name => name === 'readable-stream';

// core-util-is, used by the stream shims, relies on the Buffer global
const usesBuffer = source => source.indexOf(' Buffer.') !== -1 || source.indexOf('new Buffer') !== -1;
const findGlobals = source => usesBuffer(source) ? `var Buffer = require('buffer').Buffer;\n` : '';

const shouldIncludeProcess = source => source.indexOf('process.') !== -1;

let usedShims = [];

const usesShim = shim => usedShims.indexOf(shim) !== -1;
const usesProcess = () => usesShim('process');

const uniq = list => {
  return Object.keys(list.reduce((obj, _) => {
    if (!obj[_]) obj[_] = true;
    return obj;
  }, {}));
};

const addShims = shims => usedShims = uniq(usedShims.concat(shims));

const getUsedShims = () => usedShims;

const shouldSkipAlias = mod => mod === 'stream';

const getShimData = shim => shims[shim];

module.exports = {emptyShims, fileShims, getShimData, makeSpecialShimFname, isSimpleShim, isShim, actualShimName, shouldOverrideModuleName, overrideModuleName, shouldIncludeFileBasedAlias, findGlobals, getUsedShims, usesProcess, addShims, shouldSkipAlias, shouldIncludeProcess};
