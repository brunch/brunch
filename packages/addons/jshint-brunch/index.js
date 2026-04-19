'use strict';

const jshint = require('jshint').JSHINT;
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pluralize = require('pluralize');

const pad = (str, length) => {
  while (str.length < length) {
    str = ` ${str}`;
  }
  return str;
};

const removeComments = str => {
  return (str || '')
    .replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, '')
    .replace(/\/\/[^\n\r]*/g, '');
};

class JSHintLinter {
  constructor(config) {
    this.config = config || {};
    if ('jshint' in this.config) {
      console.warn('Warning: config.jshint is deprecated, please move it to config.plugins.jshint');
    }
    const cfg = this.config.plugins && this.config.plugins.jshint || this.config.jshint || {};
    this.options = cfg.options || {};
    this.globals = cfg.globals;
    this.pattern = new RegExp(cfg.pattern || /^app.*\.js$/);
    this.warnOnly = cfg.warnOnly;
    this.reporter = cfg.reporter && require(require(cfg.reporter));
    this.reporterOptions = cfg.reporterOptions;
    if (Object.keys(this.options).length === 0) {
      const filename = path.join(process.cwd(), '.jshintrc');
      try {
        const stats = fs.statSync(filename);
        if (stats.isFile()) {
          const buff = fs.readFileSync(filename);
          this.options = JSON.parse(removeComments(buff.toString()));
          this.globals = this.options.globals;
          delete this.options.globals;
        }
      } catch (_error) {
        const e = _error.toString().replace('Error: ENOENT, ', '');
        console.warn(`.jshintrc parsing error: ${e}. jshint will run with default options.`);
      }
    }
  }

  lint(file) {
    const success = !this.pattern.test(file.path) || jshint(file.data, this.options, this.globals);
    if (success) {
      return Promise.resolve();
    }
    const errors = jshint.errors.filter(error => error != null);

    let msg;
    if (this.reporter) {
      const results = errors.map(error => {
        return {
          error,
          file: file.path,
        };
      });
      this.reporter.reporter(results, undefined, this.reporterOptions);
      msg = `${chalk.gray('via JSHint')}`;
    } else {
      const errorMsg = errors.map(error => {
        const maxWidth = 120;
        if (Math.max(error.evidence && error.evidence.length || 0, error.character + error.reason.length) <= maxWidth) {
          const basePad = 10;
          return `${pad(error.line.toString(), 7)} | ${chalk.gray(error.evidence)}` +
            `${pad('^', basePad + error.character)} ${chalk.bold(error.reason)}`;
        }
        return `${pad(error.line.toString(), 7)} | col: ${error.character} | ${chalk.bold(error.reason)}`;
      });
      errorMsg.unshift(`JSHint detected ${errors.length} ${pluralize('problem', errors.length)}:`);
      errorMsg.push('\n');
      msg = errorMsg.join('\n');
    }
    if (this.warnOnly) {
      msg = `warn: ${msg}`;
    }
    return Promise.reject(msg);
  }
}

JSHintLinter.prototype.brunchPlugin = true;
JSHintLinter.prototype.type = 'javascript';
JSHintLinter.prototype.extension = 'js';

module.exports = JSHintLinter;
