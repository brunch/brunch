'use strict';
const {overrides} = require('./_norm');

describe('config.overrides', () => {
  it('should not allow nested overrides', () => {
    (() => {
      overrides({
        a: {overrides: {}},
      });
    }).should.throw();
  });


});
