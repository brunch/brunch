'use strict';
const messages = require('./messages');
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
    const message = format(messages[code] || code, params || {});
    super(message);

    this.name = 'BrunchError';
    this.code = code;
  }
}

module.exports = BrunchError;
