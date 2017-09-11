'use strict';
const {co} = require('../../__utils');
const init = require('./__plugins');

const sysPath = require('universal-path');
const cwd = process.cwd();

const abs = name => `${__dirname}/${name}`;
const rel = name => sysPath.relative(cwd, `${__dirname}/${name}`);

const obj = path => ({
  [Symbol.toPrimitive]: actual => {
    const expected = 'string';
    if (actual !== expected) {
      throw new Error(
        `Expected @@toPrimitive hint to be "${expected}", got "${actual}" instead.`
      );
    }

    return path;
  },
});

describe('`plugins.includes`', () => {
  it('is a promise', co(function* () {
    init().includes.should.be.a('promise');
  }));

  it('resolves to frozen object', co(function* () {
    (yield init().includes).should.be.frozen;
  }));

  it('resolves to an array', co(function* () {
    (yield init().includes).should.be.an('array');
  }));

  context('sync', () => {
    it('works with strings', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-a': class {
            constructor() {
              this.include = abs('a');
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-b': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return abs('b');
            }
          },
        },
      });

      (yield includes).should.eql(
        ['a', 'b'].map(rel)
      );
    }));

    it('works with arrays of strings', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-a-b': class {
            constructor() {
              this.include = ['a', 'b'].map(abs);
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-c-d': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return ['c', 'd'].map(abs);
            }
          },
        },
      });

      (yield includes).should.eql(
        ['a', 'b', 'c', 'd'].map(rel)
      );
    }));

    it('ignores `null` and `undefined` values', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-null': class {
            constructor() {
              this.include = null;
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-undefined': class {
            get brunchPlugin() {
              return true;
            }
            get include() {}
          },
          'brunch-missing': class {
            get brunchPlugin() {
              return true;
            }
          },
        },
      });

      (yield includes).should.eql([]);
    }));

    it('coerces non-array values to strings', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-a': class {
            constructor() {
              this.include = obj(abs('a'));
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-b-c': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return ['b', 'c'].map(abs).map(obj);
            }
          },
        },
      });

      (yield includes).should.eql(
        ['a', 'b', 'c'].map(rel)
      );
    }));

    it('dedupes returned paths', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-a': class {
            constructor() {
              this.include = abs('a');
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-a-b': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return ['a', 'b'].map(abs);
            }
          },
        },
      });

      (yield includes).should.eql(
        ['a', 'b'].map(rel)
      );
    }));
  });

  context('async', () => {
    it('works with strings', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-a': class {
            constructor() {
              this.include = Promise.resolve(abs('a'));
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-b': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return Promise.resolve(abs('b'));
            }
          },
        },
      });

      (yield includes).should.eql(
        ['a', 'b'].map(rel)
      );
    }));

    it('works with arrays of strings', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-a-b': class {
            constructor() {
              this.include = Promise.resolve(['a', 'b'].map(abs));
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-c-d': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return Promise.resolve(['c', 'd'].map(abs));
            }
          },
        },
      });

      (yield includes).should.eql(
        ['a', 'b', 'c', 'd'].map(rel)
      );
    }));

    it('ignores `null` and `undefined` values', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-null': class {
            constructor() {
              this.include = Promise.resolve(null);
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-undefined': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return Promise.resolve();
            }
          },
          'brunch-missing': class {
            get brunchPlugin() {
              return true;
            }
          },
        },
      });

      (yield includes).should.eql([]);
    }));

    it('coerces non-array values to strings', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-a': class {
            constructor() {
              this.include = Promise.resolve(
                obj(abs('a'))
              );
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-b-c': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return Promise.resolve(
                ['b', 'c'].map(abs).map(obj)
              );
            }
          },
        },
      });

      (yield includes).should.eql(
        ['a', 'b', 'c'].map(rel)
      );
    }));

    it('dedupes returned paths', co(function* () {
      const {includes} = init({
        modules: {
          'brunch-a': class {
            constructor() {
              this.include = Promise.resolve(abs('a'));
            }
            get brunchPlugin() {
              return true;
            }
          },
          'brunch-a-b': class {
            get brunchPlugin() {
              return true;
            }
            get include() {
              return Promise.resolve(['a', 'b'].map(abs));
            }
          },
        },
      });

      (yield includes).should.eql(
        ['a', 'b'].map(rel)
      );
    }));
  });
});
