'use strict';
const norm = require('../lib/config');
const prod = {envs: ['production']};

describe('config', () => {
  describe('paths', () => {
    it('should have cool defaults', () => {
      norm().paths.should.eql({
        root: '.',
        watched: ['app', 'test'],
        public: 'public',
        packageConfig: 'package.json',
      });
    });

    it('should allow only strings', () => {
      (() => {
        norm({
          paths: {
            root: null,
          },
        });
      }).should.throw();

      (() => {
        norm({
          paths: {
            watched: [0],
          },
        });
      }).should.throw();

      (() => {
        norm({
          paths: {
            public: true,
          },
        });
      }).should.throw();

      (() => {
        norm({
          paths: {
            packageConfig: {},
          },
        });
      }).should.throw();
    });

    describe('watched', () => {
      it('should allow single string', () => {
        norm({
          paths: {
            watched: 'a',
          },
        }).paths.watched.should.eql(['a']);
      });

      it('should not allow duplicates', () => {
        (() => {
          norm({
            paths: {
              watched: ['a', 'a'],
            },
          });
        }).should.throw();
      });
    });

    it('should join relative paths with `root`', () => {
      norm({
        paths: {
          root: 'a',
        },
      }).paths.should.eql({
        root: 'a',
        watched: ['a/app', 'a/test'],
        public: 'a/public',
        packageConfig: 'a/package.json',
      });
    });

    it('should work with absolute paths', () => {
      norm({
        paths: {
          root: 'a',
          watched: [__dirname],
          public: __dirname,
          packageConfig: __filename,
        },
      }).paths.should.eql({
        root: 'a',
        watched: [__dirname],
        public: __dirname,
        packageConfig: __filename,
      });
    });

    it('should trim trailing slashes', () => {
      norm({
        paths: {
          root: 'a/',
          watched: ['b/', 'c/'],
          public: 'd/',
          packageConfig: 'e/',
        },
      }).paths.should.eql({
        root: 'a',
        watched: ['a/b', 'a/c'],
        public: 'a/d',
        packageConfig: 'a/e',
      });
    });
  });

  describe('files', () => {
    it('should have cool defaults', () => {
      norm().files.should.eql({
        javascripts: {
          entryPoints: {},
          vendor: {},
        },
        stylesheets: {
          joinTo: {},
          entryPoints: {},
          vendor: {},
        },
      });
    });

    it('should have defaults for `stylesheets.order`', () => {
      norm({
        files: {
          stylesheets: {
            joinTo: {
              'a.js': 'a',
            },
            order: {},
          },
        },
      }).files.stylesheets.order.should
        .respondTo('after')
        .respondTo('before');
    });

    it('should coerce `javascripts.vendor` string to object', () => {
      norm({
        files: {
          javascripts: {
            vendor: 'a.js',
          },
        },
      }).files.javascripts.vendor.should.respondTo('a.js');
    });

    it('should coerce `stylesheets.vendor` string to object', () => {
      norm({
        files: {
          stylesheets: {
            vendor: 'a.css',
          },
        },
      }).files.stylesheets.vendor.should.respondTo('a.css');
    });

    it('should coerce `stylesheets.joinTo` string to object', () => {
      norm({
        files: {
          stylesheets: {
            joinTo: 'a.css',
          },
        },
      }).files.stylesheets.joinTo.should.respondTo('a.css');
    });

    it('should not allow both `entryPoints` and `joinTo`', () => {
      (() => {
        norm({
          files: {
            stylesheets: {
              joinTo: {
                'a.js': 'a',
              },
              entryPoints: {
                'b.js': 'b',
              },
            },
          },
        });
      }).should.throw();
    });

    it('should not allow `order` unless `joinTo` is present', () => {
      (() => {
        norm({
          files: {
            stylesheets: {
              order: {},
            },
          },
        });
      }).should.throw();
    });
  });

  describe('npm', () => {
    it('should have cool defaults', () => {
      norm().npm.should.eql({
        aliases: {},
        styles: {},
        compilers: {},
      });
    });

    it('should coerce `compilers` array to object', () => {
      const {compilers} = norm({
        npm: {
          compilers: ['a', 'b'],
        },
      }).npm;

      compilers.a().should.be.true;
      compilers.b().should.be.true;
    });
  });

  describe('plugins', () => {
    it('should have cool defaults', () => {
      norm().plugins.should.eql({
        on: [],
        off: [],
        only: [],
      });
    });

    it('should allow single strings', () => {
      norm({
        plugins: {
          on: 'a',
          off: 'b',
          only: 'c',
        },
      }).plugins.should.eql({
        on: ['a'],
        off: ['b'],
        only: ['c'],
      });
    });

    it('should not allow duplicates', () => {
      (() => {
        norm({
          plugins: {
            on: ['a', 'a'],
          },
        });
      }).should.throw();

      (() => {
        norm({
          plugins: {
            off: ['a', 'a'],
          },
        });
      }).should.throw();

      (() => {
        norm({
          plugins: {
            only: ['a', 'a'],
          },
        });
      }).should.throw();
    });

    it('should allow unknown keys with object values', () => {
      norm({
        plugins: {
          a: {},
        },
      }).plugins.a.should.be.an('object');
    });

    it('should not allow unknown keys with non-object values', () => {
      (() => {
        norm({
          plugins: {
            a: null,
          },
        });
      }).should.throw();

      (() => {
        norm({
          plugins: {
            a: 1,
          },
        });
      }).should.throw();

      (() => {
        norm({
          plugins: {
            a: [],
          },
        });
      }).should.throw();
    });
  });

  describe('watcher', () => {
    describe('ignored (default)', () => {
      const {ignored} = norm().watcher;

      it('should ignore dotfiles', () => {
        ignored('.a').should.be.true;
        ignored('a.b').should.be.false;
      });

      it('should ignore editors caches', () => {
        ignored('a#').should.be.true;
        ignored('a~').should.be.true;
        // ignored('a__').should.be.true;
      });

      it('should check basename', () => {
        ignored('.a/b').should.be.false;
        ignored('a/.b').should.be.true;
      });

      it('should ignore editors caches', () => {});
    });

    describe('awaitWriteFinish', () => {
      it('should be redefined if `true` specified', () => {
        norm({
          watcher: {awaitWriteFinish: true},
        }).watcher.awaitWriteFinish.should.eql({
          stabilityThreshold: 50,
          pollInterval: 10,
        });
      });
    });
  });

  describe('overrides', () => {
    it('should not allow nested overrides', () => {
      (() => {
        norm({
          overrides: {
            a: {overrides: {}},
          },
        });
      }).should.throw();
    });
  });

  describe('sourceMaps', () => {
    it('should be enabled by default', () => {
      norm().sourceMaps.should.be.true;
    });

    it('should be disabled in --production', () => {
      norm(prod).sourceMaps.should.be.false;
    });
  });

  describe('optimize', () => {
    it('should be disabled by default', () => {
      norm().optimize.should.be.false;
    });

    it('should be enabled in --production', () => {
      norm(prod).optimize.should.be.true;
    });
  });

  describe('envs', () => {
    it('should accept single value', () => {});
  });

  describe('hooks', () => {
    it('should have noop defaults', () => {
      norm().hooks.should
        .respondTo('preCompile')
        .respondTo('onCompile')
        .respondTo('teardown');
    });

    it('should allow only functions', () => {
      (() => {
        norm({
          hooks: {
            preCompile: 1,
          },
        });
      }).should.throw();

      (() => {
        norm({
          hooks: {
            onCompile: {},
          },
        });
      }).should.throw();

      (() => {
        norm({
          hooks: {
            teardown: [],
          },
        });
      }).should.throw();
    });

    it('should allow 0 or 1 parameters in `preCompile`', () => {
      norm({
        hooks: {
          preCompile() {},
        },
      });

      norm({
        hooks: {
          preCompile(a) {},
        },
      });

      (() => {
        norm({
          hooks: {
            preCompile(a, b) {},
          },
        });
      }).should.throw();
    });

    it('should promisify `preCompile` hook', () => {
      norm({
        hooks: {
          preCompile(cb) {
            cb(1);
          },
        },
      }).hooks
        .preCompile()
        .should.eventually.equal(1);
    });

    it('should allow only 0 to 2 parameters in `onCompile`', () => {
      norm({
        hooks: {
          onCompile() {},
        },
      });

      norm({
        hooks: {
          onCompile(a) {},
        },
      });

      norm({
        hooks: {
          onCompile(a, b) {},
        },
      });

      (() => {
        norm({
          hooks: {
            onCompile(a, b, c) {},
          },
        });
      }).should.throw();
    });

    it('should not allow parameters in `teardown`', () => {
      norm({
        hooks: {
          teardown() {},
        },
      });

      (() => {
        norm({
          hooks: {
            teardown(a) {},
          },
        });
      }).should.throw();
    });
  });

  describe('envs', () => {});
});
