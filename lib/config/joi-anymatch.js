'use strict';
const anymatch = require('anymatch');

module.exports = j => {
  const matcher = [
    j.string(),
    j.func().maxArity(1),
    j.regexp().forbiddenFlags('gy'),
  ];

  const matchers = j.array()
    .items(matcher)
    .single()
    .unique();

  return {
    name: 'anymatch',
    pre(val, _state, _opts) {
      const {error} = matchers.validate(val);
      if (error) throw error;
      return anymatch(val);
    },
    rules: [{
      name: 'default',
      params: {
        val: j.lazy(() => j.anymatch()),
      },
      setup({val}) {
        this._flags.default = () => val;
      },
    }],
  };
};
