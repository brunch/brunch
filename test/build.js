const test = require('ava');
const brunch = require('../lib');
const { prepareTestDir, teardownTestDir, fileContains, fileNotContains, fileExists } = require('./_test_helper');
const fixturify = require('fixturify');

test.beforeEach(() => {
  teardownTestDir();
  prepareTestDir();
});

test.serial.cb('basic build', t => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  brunch.build({}, () => {
    fileExists(t, 'public/app.js.map');
    fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains(t, 'public/app.js', `
require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);

    fileContains(t, 'public/index.html', '<h1>hello world</h1>');
    t.end();
  });
});

test.serial.cb('basic file joining', t => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'a.js': 'filea',
      'b.js': 'fileb',
      'c.js': 'filec'
    }
  });

  brunch.build({}, () => {
    fileExists(t, 'public/app.js.map');
    fileContains(t, 'public/index.html', '<h1>hello world</h1>');
    fileContains(t, 'public/app.js', `require.register("a.js", function(exports, require, module) {
filea
});

;require.register("b.js", function(exports, require, module) {
fileb
});

;require.register("c.js", function(exports, require, module) {
filec
});
`);
    t.end();
  });
});

test.serial.cb('multi file output', t => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: {
            'javascripts/app.js': /^app/,
            'javascripts/vendor.js': /^(?!app)/
          }
        }
      }
    };`,
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'a.js': 'filea',
      'b.js': 'fileb',
      'c.js': 'filec'
    },
    'vendor': {
      'a.js': 'vendora',
      'b.js': 'vendorb',
      'c.js': 'vendorc'
    }
  });

  brunch.build({}, () => {
    fileExists(t, 'public/javascripts/app.js.map');
    fileExists(t, 'public/javascripts/vendor.js.map');
    const appJs = `require.register("a.js", function(exports, require, module) {
filea
});

;require.register("b.js", function(exports, require, module) {
fileb
});

;require.register("c.js", function(exports, require, module) {
filec
});`;
    const vendorJs = `
vendora
;vendorb
;vendorc
;`;
    fileContains(t, 'public/javascripts/app.js', appJs);
    fileNotContains(t, 'public/javascripts/app.js', vendorJs);
    fileContains(t, 'public/javascripts/vendor.js', vendorJs);
    fileNotContains(t, 'public/javascripts/vendor.js', appJs);
    fileNotContains(t, 'public/javascripts/vendor.js', 'require.register("');
    fileContains(t, 'public/index.html', '<h1>hello world</h1>');
    t.end();
  });
});

test.serial.cb('entry points', t => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          entryPoints: {
            'app/initialize.js': 'bundle.js'
          }
        }
      }
    };`,
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'require("./c"); initialize',
      'c.js': 'require("b"); filec',
      'b.js': 'require("a"); fileb',
      'a.js': 'filea',
      'not-required.js': 'notrequired'
    }
  });

  brunch.build({}, () => {
    fileExists(t, 'public/bundle.js.map');
    fileContains(t, 'public/bundle.js', '//# sourceMappingURL=bundle.js.map');
    fileNotContains(t, 'public/bundle.js', `notrequired`);
    fileContains(t, 'public/bundle.js', `require.register("a.js", function(exports, require, module) {
filea
});

;require.register("b.js", function(exports, require, module) {
require("a"); fileb
});

;require.register("c.js", function(exports, require, module) {
require("b"); filec
});

;require.register("initialize.js", function(exports, require, module) {
require("./c"); initialize
});`);

    fileContains(t, 'public/index.html', '<h1>hello world</h1>');
    t.end();
  });
});

test.serial.cb('multi entry points', t => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          entryPoints: {
            'app/entry1.js': 'bundle1.js',
            'app/entry2.js': 'bundle2.js'
          }
        }
      }
    };`,
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'entry1.js': 'require("./a"); entry1',
      'entry2.js': 'require("./c"); entry2',
      'a.js': 'require("./b"); filea',
      'b.js': 'fileb',
      'c.js': 'require("./d"); filec',
      'd.js': 'filed',
      'not-required.js': 'notrequired'
    }
  });

  brunch.build({}, () => {
    fileExists(t, 'public/bundle1.js.map');
    fileExists(t, 'public/bundle2.js.map');
    fileContains(t, 'public/bundle1.js', '//# sourceMappingURL=bundle1.js.map');
    fileContains(t, 'public/bundle2.js', '//# sourceMappingURL=bundle2.js.map');
    fileNotContains(t, 'public/bundle1.js', `notrequired`);
    fileNotContains(t, 'public/bundle2.js', `notrequired`);
    fileContains(t, 'public/bundle1.js', `require.register("a.js", function(exports, require, module) {
require("./b"); filea
});

;require.register("b.js", function(exports, require, module) {
fileb
});

;require.register("entry1.js", function(exports, require, module) {
require("./a"); entry1
});`);

    fileContains(t, 'public/bundle2.js', `require.register("c.js", function(exports, require, module) {
require("./d"); filec
});

;require.register("d.js", function(exports, require, module) {
filed
});

;require.register("entry2.js", function(exports, require, module) {
require("./c"); entry2
});`);

    fileContains(t, 'public/index.html', '<h1>hello world</h1>');
    t.end();
  });
});

test.serial.cb('customize paths.public config', t => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      },
      paths: {
        public: 'dist'
      }
    };`,
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  brunch.build({}, () => {
    fileExists(t, 'dist/app.js.map');
    fileContains(t, 'dist/index.html', '<h1>hello world</h1>');
    fileContains(t, 'dist/app.js', 'console.log("hello world")');
    t.end();
  });
});
