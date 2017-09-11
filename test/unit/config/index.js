'use strict';
const norm = require('./_norm');
const prod = {env: ['production']};

describe('config', () => {
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

      it('should ignore editors caches', () => {

      });
    });

    describe('awaitWriteFinish', () => {
      it('should be redefined if `true` specified', () => {
        norm.watcher.awaitWriteFinish(true).should.eql({
          stabilityThreshold: 50,
          pollInterval: 10,
        });
      });
    });
  });

  describe('sourceMaps', () => {
    it('enabled by default', () => {
      norm().sourceMaps.should.be.true;
    });

    it('disabled in --production', () => {
      norm(prod).sourceMaps.should.be.false;
    });
  });

  describe('optimize', () => {
    it('disabled by default', () => {
      norm().optimize.should.be.false;
    });

    it('enabled in --production', () => {
      norm(prod).optimize.should.be.true;
    });
  });

  describe('env', () => {
    it('allows single string', () => {
      norm.env('a').should.eql(['a']);
    });

    it('bans duplicates', () => {
      (() => {
        norm({
          env: ['a', 'a'],
        });
      }).should.throw();
    });
  });

  describe('hooks', () => {
    it('should have noop defaults', () => {
      norm().hooks.should
        .respondTo('preCompile')
        .respondTo('onCompile')
        .respondTo('teardown');
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

  describe('env', () => {});
});
