'use strict';
const {npm} = require('./_norm');

describe('config.npm', () => {
  it('has defaults', () => {
    npm().should.eql({
      aliases: {},
      styles: {},
      compilers: {},
    });
  });

  describe('aliases', () => {
    it('allows string values', () => {
      npm.aliases({a: 'b'}).should.eql({a: 'b'});
    });
  });

  describe('styles', () => {
    it('allows string array values', () => {
      npm.styles.a(['b', 'c']).should.eql(['b', 'c']);
    });

    it('coerces string values', () => {
      npm.styles.a('b').should.eql(['b']);
    });

    it('bans duplicates in values', () => {
      (() => {
        npm.styles({
          a: ['b', 'b'],
        });
      }).should.throw();
    });
  });

  describe('compilers', () => {
    it('coerces string array to object', () => {
      npm.compilers(['a', 'b']).should
        .respondTo('a')
        .respondTo('b');
    });

    it('coerces single string to object', () => {
      npm.compilers('a').should.respondTo('a');
    })

    it('coerces object values to functions', () => {
      npm.compilers({a: 'b'}).should.respondTo('a');
    });
  });
});
