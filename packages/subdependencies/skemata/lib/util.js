'use strict';

const _type = x => {
  if (typeof x === 'object') {
    const s = Object.prototype.toString.call(x);

    if (s === '[object Array]') {
      return 'array';
    } else if (s === '[object RegExp]') {
      return 'regexp';
    } else if (s === '[object Null]') {
      return 'null';
    } else if (s === '[object Object]') {
      return 'object';
    } else {
      return s.replace('[object ', '').replace(']', '').toLowerCase();
    }
  } else if (typeof x === 'number') {
    return 'number';
  } else if (typeof x === 'function') {
    return 'function';
  } else if (typeof x === 'boolean') {
    return 'boolean';
  } else if (typeof x === 'string') {
    return 'string';
  } else if (typeof x === 'undefined') {
    return 'undefined';
  } else {
    return typeof x;
  }
};

const _clone = x => {
  const type = _type(x);
  switch (type) {
    case 'object':
      const newObj = {};
      Object.keys(x).forEach(key => {
        newObj[key] = _clone(x[key]);
      });
      return newObj;
    case 'array': return x.slice().map(_clone);
    case 'regexp': return new RegExp(x.source, x.flags);
    case 'function': return x.bind({});
    default: return x;
  }
};

module.exports = {_type, _clone};
