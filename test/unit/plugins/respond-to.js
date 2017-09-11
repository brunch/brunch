'use strict';
const init = require('./__plugins');

describe('`plugins.respondTo`', () => {
  it('is a function', () => {
    init().respondTo.should.be.a('function');
  });

  it('returns plugins that have callable value by given name', () => {
    const modules = {
      'brunch-method': class {
        get brunchPlugin() {
          return true;
        }
        fn() {}
      },
      'brunch-arrow': class {
        constructor() {
          this.fn = () => {};
        }
        get brunchPlugin() {
          return true;
        }
      },
      'brunch-generator': class {
        get brunchPlugin() {
          return true;
        }
        * fn() {}
      },
      'brunch-function': class {
        constructor() {
          this.fn = function() {};
        }
        get brunchPlugin() {
          return true;
        }
      },
    };

    init({modules})
      .respondTo('fn')
      .map(plugin => plugin.brunchPluginName)
      .should.eql(Object.keys(modules));
  });

  it('rejects plugins that have truthy value by given name', () => {
    init({
      modules: {
        'brunch-boolean': class {
          constructor() {
            this.fn = true;
          }
          get brunchPlugin() {
            return true;
          }
        },
        'brunch-number': class {
          get brunchPlugin() {
            return true;
          }
          get fn() {
            return 21;
          }
        },
        'brunch-string': class {
          constructor() {
            this.fn = 'fn';
          }
          get brunchPlugin() {
            return true;
          }
        },
        'brunch-symbol': class {
          get brunchPlugin() {
            return true;
          }
          get fn() {
            return Symbol();
          }
        },
        'brunch-object': class {
          constructor() {
            this.fn = {};
          }
          get brunchPlugin() {
            return true;
          }
        },
      },
    }).respondTo('fn').should.be.empty;
  });

  it('rejects plugins that have falsy value by given name', () => {
    init({
      modules: {
        'brunch-missing': class {
          get brunchPlugin() {
            return true;
          }
        },
        'brunch-undefined': class {
          constructor() {
            this.fn = undefined;
          }
          get brunchPlugin() {
            return true;
          }
        },
        'brunch-null': class {
          get brunchPlugin() {
            return true;
          }
          get fn() {
            return null;
          }
        },
        'brunch-boolean': class {
          constructor() {
            this.fn = false;
          }
          get brunchPlugin() {
            return true;
          }
        },
        'brunch-number': class {
          get brunchPlugin() {
            return true;
          }
          get fn() {
            return 0;
          }
        },
        'brunch-string': class {
          constructor() {
            this.fn = '';
          }
          get brunchPlugin() {
            return true;
          }
        },
      },
    }).respondTo('fn').should.be.empty;
  });
});
