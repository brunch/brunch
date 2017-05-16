'use strict';
const anymatch = require('anymatch');

module.exports = j => {
  const matcher = j.compile([
    j.string(),
    j.object().type(RegExp),
    j.func().maxArity(1),
  ]);

  const matchers = j.array()
    .items(matcher)
    .single()
    .unique();

  return {
    name: 'anymatch',
    coerce(val, _state, _opts) {
      const {error} = matchers.validate(val);
      if (!error) return anymatch(val);
    },
    rules: [{
      name: 'default',
      params: {
        val: j.lazy(() => j.anymatch()),
      },
      setup({val}) {
        console.log('SETUP', val('.kek'));
        this._flags.default = () => () => true;
      },
    }],
  };
};
