'use strict';
const {co} = require('../../__utils');
const init = require('./__plugins');

describe('plugins', () => {
  return;

  it('exports `plugins` array', () => {
    init().plugins.should.be.an('array');
  });

  it('`plugins` array is frozen', () => {
    init().plugins.should.be.frozen;
  });

  it('exports `respondTo` method', () => {
    init().respondTo.should.be.a('function');
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

  it('sets `brunchPluginName` property with correct descriptor', () => {
    const name = 'brunch-plugin';
    plugins({
      [name]: plugin(),
    });

    const [plugin] = init().plugins;
    plugin.should.have.ownPropertyDescriptor('brunchPluginName', {
      value: name,
      writable: false,
      enumerable: false,
      configurable: true,
    });
  });

  ///

  it('`defaultEnv` is missing`', () => {
    plugins({
      'brunch-plugin': class {
        get brunchPlugin() {
          return true;
        }
      },
    });

    init().plugins.should.have.lengthOf(1);
  });

  it('`defaultEnv` is "*"', () => {
    plugins({
      'brunch-plugin': class {
        get brunchPlugin() {
          return true;
        }
        get defaultEnv() {
          return '*';
        }
      },
    });

    init().plugins.should.have.lengthOf(1);
  });

  context('optimizer', () => {
    it('is excluded by default', () => {
      plugins({
        'brunch-optimizer': class {
          get brunchPlugin() {
            return true;
          }
          optimize(file) {
            return file;
          }
        },
      });

      init().plugins.should.be.empty;
    });

    it('is excluded if `defaultEnv` is not listed in `config.env`', () => {
      config({
        env: 'foo',
      });

      plugins({
        'brunch-optimizer': class {
          get brunchPlugin() {
            return true;
          }
          get defaultEnv() {
            return 'bar';
          }
          optimize(file) {
            return file;
          }
        },
      });

      init().plugins.should.be.empty;
    });

    it('is included if `config.optimize` is `true`', () => {
      config({
        optimize: true,
        env: 'foo',
      });

      plugins({
        'brunch-optimizer-env-missing': class {
          get brunchPlugin() {
            return true;
          }
          optimize(file) {
            return file;
          }
        },
        'brunch-optimizer-env-not-listed': class {
          get brunchPlugin() {
            return true;
          }
          get defaultEnv() {
            return 'bar';
          }
          optimize(file) {
            return file;
          }
        },
      });

      init().plugins.should.have.lengthOf(1);
    });

    it('is included if listed in `config.plugins.on`', () => {
      config({
        plugins: {
          on: 'brunch-optimizer',
        },
      });

      plugins({
        'brunch-optimizer': class {
          get brunchPlugin() {
            return true;
          }
          optimize(file) {
            return file;
          }
        },
      });

      init().plugins.should.have.lengthOf(1);
    });

    it('is included if `defaultEnv` is "*"', () => {
      plugins({
        'brunch-optimizer': class {
          get brunchPlugin() {
            return true;
          }
          get defaultEnv() {
            return '*';
          }
          optimize(file) {
            return file;
          }
        },
      });

      init().plugins.should.have.lengthOf(1);
    });

    it('is included if `defaultEnv` is listed in `config.env`', () => {
      config({
        env: 'foo',
      });

      plugins({
        'brunch-optimizer': class {
          get brunchPlugin() {
            return true;
          }
          get defaultEnv() {
            return 'foo';
          }
          optimize(file) {
            return file;
          }
        },
      });

      init().plugins.should.have.lengthOf(1);
    });
  });

  it('requires plugins based on `defaultEnv`', () => {
    plugins({
      'brunch-optimizer': class {
        get brunchPlugin() {
          return true;
        }
        get defaultEnv() {
          return 'a';
        }
      }
    });

    config({
      env: 'a',
    });

    init().plugins.should.not.be.empty;
  });

  it('requires optimizers based on ``', () => {
    plugins({
      'brunch-plugin': class {
        get brunchPlugin() {
          return true;
        }
        get defaultEnv() {
          return 'production';
        }
      }
    });

    config({
      env: 'production',
    });

    init().plugins.should.have.lengthOf(1);
  });

  it('does not require optimizers when `optimize: false`', () => {
    plugins({
      'brunch-plugin': class {
        get brunchPlugin() {
          return true;
        }
        optimize() {}
      },
    });

    init().plugins.should.be.empty;
  });

  it('requires optimizers w/o `defaultEnv` when `optimize` is `true`', () => {
    config({
      optimize: true,
    });

    plugins({
      'brunch-plugin': class {
        get brunchPlugin() {
          return true;
        }
        optimize() {}
      },
    });

    init().plugins.should.have.lengthOf(1);
  });
});
