'use strict';
const {co} = require('../../__utils');
const {
  config,
  plugins,
  trap,
  init,
} = require('./__plugins');

describe('plugins', () => {
  it('exports `respondTo` method', () => {
    init().respondTo.should.be.a('function');
  });

  it('exports `includes` promise', co(function* () {
    (yield init().includes).should.be.an('array');
  }));

  it('exports `plugins` array', () => {
    init().plugins.should.be.an('array');
  });

  it('does not require modules without `brunch` in name', () => {
    trap([
      'plugin',
    ]);

    init.should.not.throw;
  });

  it('does not require deprecated plugins', () => {
    trap([
      'javascript-brunch',
      'css-brunch',
    ]);

    init.should.not.throw;
  });

  it('does not require plugins listed in `config.plugins.off`', () => {
    const name = 'brunch-plugin';

    trap([
      name,
    ]);

    config({
      plugins: {
        off: name,
      },
    });

    init.should.not.throw;
  });

  it('exclusively requires plugins listed in `config.plugins.only`', () => {
    trap([
      'brunch-plugin',
    ]);

    config({
      plugins: {
        only: 'brunch-other-plugin',
      },
    });

    init.should.not.throw;
  });

  it('skips non-classes', () => {
    plugins({
      'brunch-plugin': {
        prototype: {
          brunchPlugin: true,
        },
      },
    });

    init().plugins.should.be.empty;
  });

  it('skips classes without `brunchPlugin`', () => {
    plugins({
      'brunch-plugin': class {},
    });

    init().plugins.should.be.empty;
  });

  it('does not throw on arrow functions', () => {
    plugins({
      'brunch-plugin': () => {},
    });

    init().plugins.should.be.empty;
  });

  it('sets `brunchPluginName` property', () => {
    const name = 'brunch-plugin';
    plugins({
      [name]: class {
        get brunchPlugin() {
          return true;
        }
      },
    });

    const [plugin] = init().plugins;
    plugin.brunchPluginName.should.equal(name);
  });
});
