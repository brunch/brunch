const test = require('ava');
const cp = require('child_process');
const brunch = require('../lib');
const { prepareTestDir, teardownTestDir, fileContains, fileDoesNotContains, fileExists } = require('./_test_helper');
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
    fileDoesNotContains(t, 'public/javascripts/app.js', vendorJs);
    fileContains(t, 'public/javascripts/vendor.js', vendorJs);
    fileDoesNotContains(t, 'public/javascripts/vendor.js', appJs);
    fileDoesNotContains(t, 'public/javascripts/vendor.js', 'require.register("');
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
    fileDoesNotContains(t, 'public/bundle.js', `notrequired`);
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
    fileDoesNotContains(t, 'public/bundle1.js', `notrequired`);
    fileDoesNotContains(t, 'public/bundle2.js', `notrequired`);
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

test.serial.cb('npm integration', t => {
  fixturify.writeSync('.', {
    'package.json': `
      {
        "dependencies": {
          "react": "0.14.0",
          "react-dom": "0.14.0",
          "socrates": "1.0.2",
          "bignumber.js": "*"
        },
        "devDependencies": {
          "javascript-brunch": "^2.0.0"
        }
      }
    `,
    'brunch-config.js': `
      module.exports = {
        files: {
          javascripts: {
            joinTo: 'app.js'
          }
        },
        npm: {
          globals: {
            React: 'react'
          }
        }
      };
    `,
    'app': {
      'meaning.js': 'module.exports = 42;',
      'initialize.js': `
        var React = require('react');
        var ReactDOM = require('react-dom');
        var socrates = require('socrates');
        require('./meaning.js');
        require('bignumber.js');
      `
    }
  });

  cp.exec('npm install', () => {
    brunch.build({}, () => {
      const contains = text => fileContains(t, 'public/app.js', text);
      const doesntContain = text => fileNotContains(t, 'public/app.js', text);

      // sets globals
      contains('window.React = require("react");');
      // includes required files
      contains('require.register("react/react.js",');
      contains('require.register("react-dom/index.js",');
      // and doesn't use windows slashes for module names
      doesntContain('require.register("react\\react.js",');
      doesntContain('require.register("react-dom\\index.js",');
      // adds aliases for main files (that are not index.js)
      contains('require.alias("react/react.js", "react");');
      // also spot-replaces process.env.NODE_ENV
      doesntContain('process.env.NODE_ENV');
      contains(`'development' !== 'production'`);
      // includes the process shim
      contains('require.alias("process/browser.js", "process");');
      contains(`process = require('process');`);
      // indirectly-used @scoped modules should be fine, too
      contains('require.register("@f/combine-reducers/lib/index.js",');
      // finally, modules with .js in their name are correctly processed
      contains('require.alias("bignumber.js/bignumber.js", "bignumber.js");');

      t.end();
    });
  });
});

test.serial.cb('compiling npm packages', t => {
  fixturify.writeSync('.', {
    'package.json': `
      {
        "dependencies": {
          "credit-card": "2.0.0"
        },
        "devDependencies": {
          "javascript-brunch": "^2.0.0",
          "babel-brunch": "^6.0.4"
        }
      }
    `,
    'brunch-config.js': `
      module.exports = {
        files: {
          javascripts: {
            joinTo: 'app.js'
          }
        },
        npm: {
          compilers: ['babel-brunch']
        }
      };
    `,
    'app': {
      'initialize.js': `
        var cc = require('credit-card');
      `
    }
  });

  cp.exec('npm install', () => {
    brunch.build({}, () => {
      const contains = text => fileContains(t, 'public/app.js', text);
      const doesntContain = text => fileNotContains(t, 'public/app.js', text);

      // credit-card is compiled, too
      doesntContain('const Reach');
      contains('var Reach');

      t.end();
    });
  });
});
