'use strict';
const {CLIEngine} = require('eslint');

class ESLinter {
  constructor(config = {}) {
    const params = config.plugins.eslint || {};
    this.engine = new CLIEngine(params.config);
    this.pattern = params.pattern || /^app\/.*\.jsx?$/;
    this.warnOnly = typeof params.warnOnly === 'boolean' ? params.warnOnly : true;
    this.formatter = CLIEngine.getFormatter(params.formatter);
  }

  lint(file) {
    const report = this.engine.executeOnText(file.data, file.path);
    if (!report.errorCount && !report.warningCount) return;

    const msg = `ESLint reported:\n${this.formatter(report.results)}`;
    throw this.warnOnly ? `warn: ${msg}` : msg;
  }
}

ESLinter.prototype.brunchPlugin = true;
ESLinter.prototype.type = 'javascript';

module.exports = ESLinter;
