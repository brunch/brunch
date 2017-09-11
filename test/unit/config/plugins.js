'use strict';
const {plugins} = require('./_norm.js');

describe('config.plugins', () => {
  it('has defaults', () => {
    plugins().should.eql({
      on: [],
      off: [],
      only: [],
    });
  });

  it('allows single strings', () => {
    plugins({
      on: 'a',
      off: 'b',
      only: 'c',
    }).should.eql({
      on: ['a'],
      off: ['b'],
      only: ['c'],
    });
  });

  it('bans duplicates', () => {
    (() => {
      plugins({
        on: ['a', 'a'],
      });
    }).should.throw();

    (() => {
      plugins({
        off: ['b', 'b'],
      });
    }).should.throw();

    (() => {
      plugins({
        only: ['c', 'c'],
      });
    }).should.throw();
  });

  it('allows unknown keys with object values', () => {
    plugins.a({}).should.be.an('object');
  });
});
