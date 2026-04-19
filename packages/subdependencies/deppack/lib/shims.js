'use strict';

const emptyShims = [];
const fileShims = {};

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

// core-util-is, used by the stream shims, relies on the Buffer global
const findGlobals = source => '';
const shouldIncludeProcess = source => false;
const getShimData = shim => shims[shim];

module.exports = {emptyShims, fileShims, getShimData, makeSpecialShimFname, isSimpleShim, isShim, actualShimName, findGlobals, shouldIncludeProcess};
