'use strict';
const DONT_MERGE = Symbol('dontMerge');
const WAS_CHANGED = Symbol('wasChanged');

const clone = val => new val.constructor(val);
const deepAssign = (target, ...sources) => {
  const dontMerge = target[DONT_MERGE] || [];
  const wasChanged = target[WAS_CHANGED] || (() => {});

  for (const source of sources) {
    if (source == null) continue;

    for (const [key, val] of Object.entries(source)) {
      const willMerge = val === Object(val) && !dontMerge.includes(key);
      if (willMerge) {
        let nested = target[key];
        if (nested == null) {
          nested = target[key] = clone(val);
        }

        if (Array.isArray(val)) {
          nested.push(...val);
        } else {
          deepAssign(nested, val);
        }
      } else {
        target[key] = val;
      }

      wasChanged.call(target, key);
    }
  }

  return target;
};

deepAssign.dontMerge = DONT_MERGE;
deepAssign.wasChanged = WAS_CHANGED;

module.exports = deepAssign;
