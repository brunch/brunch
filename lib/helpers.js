'use strict';
const debug = require('debug')('brunch:helpers');
const os = require('os');
const SourceNode = require('source-map').SourceNode;

let isWindows = exports.isWindows = os.platform() === 'win32';

const windowsStringReplace = (search, replacement) => {
  return _ => {
    if (isWindows && typeof _ === 'string') {
      return _.replace(search, replacement);
    } else {
      return _;
    }
  };
};

exports.replaceSlashes = windowsStringReplace(/\//g, '\\');
exports.replaceBackSlashes = windowsStringReplace(/\\/g, '\/');

exports.prettify = (object) => {
  return Object.keys(object).map(key => `${key}=${object[key]}`).join(' ');
};

exports.identityNode = (code, source) => {
  return new SourceNode(1, 0, null, code.split('\n').map((line, index) => {
    return new SourceNode(index + 1, 0, source, line + '\n');
  }));
};

exports.formatError = (error, path) => {
  return error.code + " of '" + path + "' failed. " + (error.toString().slice(7));
};
