'use strict';
const init = require('./__plugins');

describe('`plugins.plugins`', () => {
  it('is frozen object', () => {
    init().plugins.should.be.frozen;
  });

  it('is an array', () => {
    init().plugins.should.be.an('array');
  });
});
