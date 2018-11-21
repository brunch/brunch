'use strict';
const {rollup} = require('rollup');

(async () => {
  const bundle = await rollup({
    input: './kek/a.js',
  });

  console.log(bundle.cache.modules);
})();
