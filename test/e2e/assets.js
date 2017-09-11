'use strict';
const build = require('./_build');

describe('assets', () => {
  it('copies text assets', async () => {
    const name = 'index.html';
    const data = '<!doctype html>';

    await build({
      assets: {
        [name]: data,
      },
    });

    `public/${name}`.should.be.a.file().with.content(data);
  });

  it('copies binary assets', async () => {

  });
});
