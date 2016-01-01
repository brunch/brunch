'use strict';
const debug = require('debug')('brunch:helpers');
const os = require('os');
const promisify = require('./promise').promisify;
const SourceNode = require('source-map').SourceNode;

const isWindows = exports.isWindows = os.platform() === 'win32';

const windowsStringReplace = (search, replacement) => {
  return str => {
    if (isWindows && typeof str === 'string') {
      return str.replace(search, replacement);
    } else {
      return str;
    }
  };
};

const deepExtend = (object, properties, rootFiles) => {
  if (rootFiles == null) rootFiles = {};
  const nestedObjs = Object.keys(rootFiles).map(file => rootFiles[file]);
  Object.keys(properties).forEach(key => {
    const value = properties[key];
    if (toString.call(value) === '[object Object]' &&
      nestedObjs.indexOf(object) === -1) {
      if (object[key] == null) object[key] = {};
      return deepExtend(object[key], value, rootFiles);
    } else {
      return object[key] = value;
    }
  });
  return object;
};

exports.promisifyPlugin = (len, f) => f.length === len ? f : promisify(f);

exports.replaceSlashes = windowsStringReplace(/\//g, '\\');
exports.replaceBackSlashes = windowsStringReplace(/\\/g, '\/');

exports.deepExtend = deepExtend;

exports.prettify = (object) => {
  return Object.keys(object).map(key => `${key}=${object[key]}`).join(' ');
};

exports.identityNode = (code, source) => {
  return new SourceNode(1, 0, null, code.split('\n').map((line, index) => {
    return new SourceNode(index + 1, 0, source, line + '\n');
  }));
};

exports.formatError = (error, path) => {
  const err = error.toString().slice(7);
  return `${error.code} of ${path} failed. ${err}`;
};
