'use strict';
const norm = require('../lib/config');

describe('config', () => {
  it('should wrap anymatch patterns in functions', () => {
    norm({}).conventions.assets.should.be.a('function');
    const {assets} = norm({
      conventions: {
        assets: /\d/,
      },
    }).conventions;

    console.log(assets("a"))
  });

  describe('default ignored', () => {
    const {ignored} = norm().watcher;
    it('should ignore dotfiles', () => {
      ignored('.kek').should.be.true;
    })
  })

  // it('should return deeply frozen object', () => {
  //   const res = test({ envs: [], paths: {
  //     a: [/a/]
  //   } });
  //   console.log(res.files.stylesheets.order.before());
  // });
});
