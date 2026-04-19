'use strict';
const Deppack = require('./lib/deppack');
const NoDeppack = require('./lib/no-deppack');

let deppack; // eslint-disable-line prefer-const
const bindToDeppack = (fnName) => {
  return function() {
    if (!deppack) {
      throw new Error('deppack is not initialized');
    }
    return deppack[fnName].apply(deppack, arguments);
  };
};

Object.getOwnPropertyNames(Deppack.prototype)
  .filter(x => x !== 'init' && x !== 'constructor')
  .forEach(fnName => {
    exports[fnName] = bindToDeppack(fnName);
  });

exports.loadInit = (config, json) => {
  deppack = config.npm.enabled ? new Deppack(config, json) : new NoDeppack();
  return deppack.init();
};
