'use strict';
const DONT_MERGE = Symbol('dont-merge');
const WAS_CHANGED = Symbol('was-changed');

const deepAssign = (target, obj) => {
  const dontMerge = obj[DONT_MERGE] || [];
  const wasChanged = obj[WAS_CHANGED] || (() => {});

  for (const [key, val] of Object.entries(obj)) {
    const isPrimitive = val !== Object(val);
    const shouldMerge = isPrimitive || dontMerge.includes(key);

    if (shouldMerge) {
      let nested = target[key];
      if (Array.isArray(nested)) {
        nested.push(...val);
      }
      if (deepTarget == null) {
        target[key] = {};
      }

      deepAssign(deepTarget, val);
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
