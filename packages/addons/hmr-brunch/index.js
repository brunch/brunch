'use strict';

const sysPath = require('path');
const esprima = require('esprima');
const escodegen = require('escodegen');

const isIf = node => node.type === 'IfStatement';
const isIdX = (node, x) => node.type === 'Identifier' && node.name === x;

const isModuleHot = node => {
  return node.type === 'MemberExpression' && isIdX(node.object, 'module') && isIdX(node.property, 'hot');
};

const isIfModuleHot = node => isIf(node) && isModuleHot(node.test);

class HotStripOptimizer {
  constructor(config) {
    if (config.modules.definition !== 'commonjs' && config.hot) {
      throw new Error("hot module reloading only works with config.modules.definition = 'commonjs'");
    }
    this.hot = config.hot;
    this.isProduction = config.env.indexOf('production') !== -1;
  }

  optimize(params) {
    if (!this.hot || !this.isProduction) return Promise.resolve(params.data);

    const source = params.data;
    const syntax = esprima.parse(source);

    let node;
    const findHot = () => {
      node = syntax.body.find(isIfModuleHot);
      return node;
    };
    while (findHot()) {
      syntax.body.splice(syntax.body.indexOf(node), 1);
    }

    const processed = escodegen.generate(syntax);
    return Promise.resolve(processed);
  }

  get include() {
    return this.hot && !this.isProduction ?
      [sysPath.join(__dirname, 'runtime.js')] :
      [];
  }
}

HotStripOptimizer.prototype.brunchPlugin = true;
HotStripOptimizer.prototype.type = 'javascript';
HotStripOptimizer.prototype.extension = 'js';
HotStripOptimizer.prototype.defaultEnv = '*';

module.exports = HotStripOptimizer;
