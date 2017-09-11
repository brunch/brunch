'use strict';
const {co} = require('../../__utils');
const init = require('./__plugins');

describe('plugins', () => {
  describe('filtering by type', () => {
    it('rejects non-classes', () => {
      init({
        modules: {
          'brunch-plugin': {
            prototype: {
              brunchPlugin: true,
            },
          },
        },
      }).plugins.should.be.empty;
    });

    it('accepts classes with thruthy `brunchPlugin`', () => {
      const modules = {
        'brunch-boolean': class {
          get brunchPlugin() {
            return true;
          }
        },
        'brunch-number': class {
          get brunchPlugin() {
            return 42;
          }
        },
        'brunch-string': class {
          get brunchPlugin() {
            return 'yes';
          }
        },
        'brunch-symbol': class {
          get brunchPlugin() {
            return Symbol();
          }
        },
        'brunch-object': class {
          get brunchPlugin() {
            return {};
          }
        },
        'brunch-function': class {
          brunchPlugin() {}
        },
      };

      init({modules}).plugins.should.have.lengthOf(
        Object.keys(modules).length
      );
    });

    it('rejects classes with falsy `brunchPlugin`', () => {
      init({
        modules: {
          'brunch-missing': class {},
          'brunch-undefined': class {
            get brunchPlugin() {}
          },
          'brunch-null': class {
            get brunchPlugin() {
              return null;
            }
          },
          'brunch-boolean': class {
            get brunchPlugin() {
              return false;
            }
          },
          'brunch-number': class {
            get brunchPlugin() {
              return NaN;
            }
          },
          'brunch-string': class {
            get brunchPlugin() {
              return '';
            }
          },
        },
      }).plugins.should.be.empty;
    });

    it('does not throw on arrow functions', () => {
      init({
        modules: {
          'brunch-plugin': () => {},
        },
      }).plugins.should.be.empty;
    });
  });

  it('sets `brunchPluginName` property with correct descriptor', () => {
    const name = 'brunch-plugin';
    const [plugin] = init({
      modules: {
        [name]: class {
          get brunchPlugin() {
            return true;
          }
        },
      },
    }).plugins;

    plugin.should.have.ownPropertyDescriptor('brunchPluginName', {
      value: name,
      writable: false,
      enumerable: false,
      configurable: true,
    });
  });

  describe('filtering by env', () => {

  });

  return;

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
