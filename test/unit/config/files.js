'use strict';
const {files} = require('./_norm');

describe('config.files', () => {
  describe('javascripts', () => {
    const js = files.javascripts;

    it('has defaults', () => {
      js().should.eql({
        vendor: {},
      });
    });

    describe('entryPoints', () => {
      it('allows string values', () => {
        js.entryPoints({a: 'b'}).should.eql({a: 'b'});
      });
    });

    describe('vendor', () => {
      it('coerces string value to object', () => {
        js.vendor('a').should
          .be.an('object')
          .respondTo('a');
      });

      it('coerces object values to functions', () => {
        js.vendor({a: /b/}).should.respondTo('a');
      });
    });
  });

  describe('stylesheets', () => {
    const css = files.stylesheets;

    it('has defaults', () => {
      css().should.eql({
        vendor: {},
      });
    });

    describe('entryPoints', () => {
      it('allows string values', () => {
        css.entryPoints({a: 'b'}).should.eql({a: 'b'});
      });
    });

    describe('vendor', () => {
      it('coerces string value to object', () => {
        css.vendor('a').should
          .be.an('object')
          .respondTo('a');
      });

      it('coerces object values to functions', () => {
        css.vendor({
          a: [() => true],
        }).should.respondTo('a');
      });
    });

    describe('joinTo', () => {
      it('coerces string value to object', () => {
        css.joinTo('a').should
          .be.an('object')
          .respondTo('a');
      });

      it('coerces object values to functions', () => {
        css.joinTo({a: 'b'}).should.respondTo('a');
      });
    });

    it('bans both `entryPoints` and `joinTo` present', () => {
      (() => {
        css({
          entryPoints: {a: 'a'},
          joinTo: {b: 'b'},
        });
      }).should.throw();
    });

    describe('order', () => {
      it('is banned if `joinTo` is absent', () => {
        (() => {
          css({
            order: {},
          });
        }).should.throw();
      });

      it('coerces `before` to function', () => {
        css({
          joinTo: {},
          order: {before: ['a']},
        }).order.should.respondTo('before');
      });

      it('coerces `after` to function', () => {
        css({
          joinTo: {},
          order: {after: /a/},
        }).order.should.respondTo('after');
      });
    });
  });
});
