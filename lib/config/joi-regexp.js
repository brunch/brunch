'use strict';
module.exports = j => ({
  name: 'regexp',
  base: j.object().type(RegExp),
  rules: [{
    name: 'forbiddenFlags',
    params: {
      flags: j.string(),
    },
    validate({flags}, value, state, options) {
      if (value.flags.includes(flags)) {
        return this.createError('number.round', { v: value }, state, options);
      }

      return value;
    },
  }],
});
