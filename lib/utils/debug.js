'use strict';

const debugFactory = require('debug');

module.exports = namespace => {
  debugFactory.enable(namespace);
  return debugFactory(namespace);
};
