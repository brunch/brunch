'use strict';
const messages = require('./messages');

const format = (template, params) => {
  return template
    .replace(/#{\s*(\w+)\s*}/g, (_, key) => params[key] || '')
    .concat(`\n${params.error || ''}`);
};

class BrunchError extends Error {
  constructor(code, params) {
    const message = code in messages ?
      format(messages[code], params) :
      code;

    super(message);

    Error.captureStackTrace(this, this.constructor);
    this.name = 'BrunchError';
  }

  static get rethrow() {
    return message => error => {
      throw new this.constructor(message, {error});
    };
  }
}

module.exports = BrunchError;
