'use strict';
const {expect} = require('chai');
const ESLinter = require('.');

const data = 'with (a) eval(b)';
const createPlugin = eslint => {
  return new ESLinter({
    plugins: {eslint},
  });
};

describe('eslint-brunch', () => {
  it('should be an object', () => {
    expect(createPlugin()).to.be.instanceof(ESLinter);
  });

  it('should have `lint` method', () => {
    expect(createPlugin()).to.respondTo('lint');
  });

  describe('config', () => {
    it('should use `.eslintrc` by default', () => {
      expect(() => {
        createPlugin().lint({data});
      }).to.throw('2 errors');
    });

    it('should override `.eslintrc`', () => {
      expect(() => {
        createPlugin({
          config: {
            rules: {
              'no-with': 'off',
            },
          },
        }).lint({data});
      }).to.throw('1 error');

      expect(() => {
        createPlugin({
          config: {
            rules: {
              'no-eval': 'off',
              'no-with': 'off',
            },
          },
        }).lint({data});
      }).not.to.throw();
    });
  });

  describe('pattern', () => {
    it('should ignore `node_modules` by default', () => {
      expect('node_modules/file.js').not.to.match(createPlugin().pattern);
    });

    it('should match `.js` files by default', () => {
      expect('app/file.js').to.match(createPlugin().pattern);
    });

    it('should match `.jsx` files by default', () => {
      expect('app/file.jsx').to.match(createPlugin().pattern);
    });

    it('should be configurable', () => {
      expect('app/file.mjs').to.match(createPlugin({pattern: /\.mjs$/}).pattern);
    });
  });

  describe('formatter', () => {
    it('should default to `stylish`', () => {
      expect(() => {
        createPlugin().lint({data});
      }).to.throw('✖');
    });

    it('should be configurable', () => {
      expect(() => {
        createPlugin({formatter: 'table'}).lint({data});
      }).to.throw('╔');

      expect(() => {
        createPlugin({formatter: 'html'}).lint({data});
      }).to.throw('<!DOCTYPE html>');
    });
  });

  describe('warnOnly', () => {
    it('should default to `true`', () => {
      expect(() => {
        createPlugin().lint({data});
      }).to.throw(/^warn:/);
    });

    it('should be configurable', () => {
      expect(() => {
        createPlugin({warnOnly: false}).lint({data});
      }).to.throw(/^ESLint/);
    });
  });
});
