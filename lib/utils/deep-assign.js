'use strict';
const DONT_MERGE = Symbol('dont-merge');
const WAS_CHANGED = Symbol('was-changed');

const deepAssign = (target, obj = {}) => {
  const dontMerge = obj[DONT_MERGE] || [];
  const wasChanged = obj[WAS_CHANGED] || (() => {});

  for (const [key, val] of Object.entries(obj)) {
    const shouldMerge = val === Object(val) && !dontMerge.includes(key);
    let nested = target[key];
    if (nested == null) {
      nested = target[key] = {};
    }

    if (shouldMerge) {
      if (Array.isArray(nested)) {
        nested.push(...val);
      } else {
        deepAssign(nested, val);
      }
    } else {
      target[key] = val;
    }

    wasChanged.call(obj, key);
  }

  return target;
};

deepAssign.dontMerge = DONT_MERGE;
deepAssign.wasChanged = WAS_CHANGED;

module.exports = deepAssign;
