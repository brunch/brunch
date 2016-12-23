'use strict';
const messages = require('./messages');
const pipelineMessages = ['Compiling', 'Linting', 'Optimizing'];
const format = (template, params) => {
  let withError = false;
  let message = template.replace(/#{\s*(\w+)\s*}/g, (_, key) => {
    if (key === 'error') withError = true;
    return params[key] || '';
  });

  if (!withError) message += `\n${params.error || ''}`;
  return message;
};

class BrunchError extends Error {
  constructor(code, params) {
    const message = code in messages ?
      format(messages[code], params || {}) :
      pipelineMessages.includes(code) ? params.error.message : code;

    super(message);

    Error.captureStackTrace(this, this.constructor);
    this.name = 'BrunchError';
    this.code = code;
    this.pipelineCode = code;
  }
}

module.exports = BrunchError;
