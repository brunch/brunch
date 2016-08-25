'use strict';
const messages = require('./messages');
const pipelineMessages = ['Compiling', 'Linting', 'Optimizing'];
const format = (template, params) => {
  return template
    .replace(/#{\s*(\w+)\s*}/g, (_, key) => params[key] || '')
    .concat(`\n${params.error || ''}`);
};

class BrunchError extends Error {
  constructor(code, params) {
    const message = code in messages ?
      format(messages[code], params) :
      pipelineMessages.includes(code) ? params.error.message : code;

    super(message);

    Error.captureStackTrace(this, this.constructor);
    this.name = 'BrunchError';
    this.code = code;
    this.pipelineCode = code;
  }
}

BrunchError.rethrow = message => error => {
  throw new BrunchError(message, {error});
};

module.exports = BrunchError;
