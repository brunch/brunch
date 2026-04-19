'use strict';
const TerserOptimizer = require('.');
const createPlugin = config => {
  return new TerserOptimizer({
    plugins: {},
    ...config,
  });
};

const path = 'file.js';
const data = '(function() {var first = 5; window.second = first;})()';
const uglified = 'window.second=5;';
const modern = `
  // All credits to Netflix for providing this approach to ES6 feature detection.
  /* https://gist.github.com/DaBs/89ccc2ffd1d435efdacff05248514f38 */

  class ಠ_ಠ extends Array {
    constructor(j = "a", ...c) {
      const q = (({u: e}) => {
        return { [\`s\${c}\`]: Symbol(j) };
      })({});

      super(j, q, ...c);
    }
  }

  new Promise((f) => {
    const a = function* (){
      return "\u{20BB7}".match(/./u)[0].length === 2 || true;
    };

    for (let vre of a()) {
      const [uw, as, he, re] = [
        new Set(),
        new WeakSet(),
        new Map(),
        new WeakMap(),
      ];
      break;
    }

    f(new Proxy({}, {
      get: (han, h) => h in han ? han[h] : "42".repeat(0o10)
    }),);
  }).then(bi => new ಠ_ಠ(bi.rd));
`;

describe('terser-brunch', () => {
  it('should have `optimize` method', () => {
    createPlugin().should.respondTo('optimize');
  });

  it('should compile and produce valid result', async () => {
    (await createPlugin().optimize({data, path})).should.eql({data: uglified});
  });

  it('should optimize modern JavaScript', async () => {
    const {data} = (await createPlugin().optimize({data: modern, path}));
    const arr = await eval(data);

    arr.should.be.an('array');
    arr[0].should.equal('4242424242424242');
    arr[1].s.should.be.a('symbol');
  });

  it('should produce source maps', async () => {
    const plugin = createPlugin({
      sourceMaps: true,
    });

    (await plugin.optimize({data, path})).should.eql({
      data: uglified,
      map: '{"version":3,"sources":["0"],"names":["window","second"],"mappings":"AAA4BA,OAAOC,OAAV"}',
    });
  });

  it('should return ignored files as-is',async () => {
    const path = 'ignored.js';
    const map = '{"version": 3}';

    const plugin = createPlugin({
      plugins: {
        terser: {
          ignored: path,
        },
      },
    });

    (await plugin.optimize({data, path, map})).should.eql({data, map});
  });

  it('should match ignored files correctly', async () => {
    const plugin = createPlugin({
      plugins: {
        terser: {
          ignored: 'ignored.js',
        },
      },
    });

    (await plugin.optimize({data, path: 'file.js'})).should.eql({data: uglified});
  });
});
