'use strict';

/**
 * Module dependencies.
 */

const rework = require('rework');
const mixin = require('rework-plugin-mixin');
const mixins = mixin(require('rework-mixins'));
const variant = require('rework-variant');
const imprt = require('rework-import');
const whitespace = require('css-whitespace');

// Load plugins.
[
  'rework-plugin-ease',
  'rework-plugin-colors',
  'rework-plugin-references',
  'rework-plugin-at2x',
  'rework-inherit',
  'rework-shade'
].forEach(require);

class Style {
  /**
   * Initialize a new Style with the given css `str`.
   *
   * Options:
   *
   *  - `whitespace` utilize css whitespace transformations
   *  - `compress` enable output compression
   *
   * @param {String} str
   * @param {Object} options
   * @api public
   */
  constructor(str, options) {
    options = options || {};
    if (options.whitespace) str = whitespace(str);
    this.path = options.path || '.';
    this.str = str;
    this.compress = options.compress;
    this.functions = options.functions;
    this.rework = rework(str);
  }

  /**
   * Return the compiled CSS.
   *
   * @return {String}
   * @api public
   */

  compile(fn) {
    const rew = this.rework;

    return rew
      .consume(imprt({path: this.path, transform: whitespace}))
      .consume(() => {
        let data;
        try {
          rew.use(variant());
          rew.use(mixins);
          if (this.functions) rew.use(this.functions);
          data = rew.toString({compress: this.compress});
        } catch (e) {
          return fn(e);
        }
        fn(null, {data: data, dependencies: rew.dependencies});
      }, error => fn(error));
  }
}

/**
 * Expose `Style`.
 */

module.exports = Style;
