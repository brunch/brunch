'use strict';

const sysUtil = require('util');
const v = require('./types');
const t = {v};

const format = r => {
  if (r.ok) return;
  if (r.type === 'simple') {
    return `expected: ${r.expType}, got: ${r.acType} (${sysUtil.format(r.val)})`;
  }
};

const flatten = (r, n) => {
  if (r.ok && !r.type) return [{path: n, result: r}];
  if (r.type === 'simple') {
    return [{path: n, result: r}];
  } else {
    const rs = r.itemResults;
    const it = {path: n, result: r};
    return rs.map(r_ => {
      const itemPath = r_.path;
      const el = n ? n +'.' + itemPath : itemPath;
      const itemResult = r_.result;
      return flatten(itemResult, el);
    }).reduce((acc, x) => acc.concat(x), []).concat([it]);
  }
};

const formatObject = (r, startPath) => {
  const fl = flatten(r, startPath);

  const rr = { errors: [], warnings: [] };

  fl.forEach(r_ => {
    const path = r_.path;
    const result = r_.result;
    if (!result.ok && format(result)) {
      rr.errors.push({ path, result: format(result) });
    }
    if (result.warning) {
      rr.warnings.push({ path, warning: result.warning });
    }
  });

  return rr;
};

t.formatObject = formatObject;

module.exports = t;
