'use strict';
const brunch = require('../lib');
const helpers = require('./_utils');
const prepareTestDir = helpers.prepareTestDir;
const teardownTestDir = helpers.teardownTestDir;
const npmInstall = helpers.npmInstall;
const fileContains = helpers.fileContains;
const fileDoesNotContain = helpers.fileDoesNotContain;
const fileExists = helpers.fileExists;
const fileDoesNotExist = helpers.fileDoesNotExist;
const fileEquals = helpers.fileEquals;
const spyOnConsole = helpers.spyOnConsole;
const restoreConsole = helpers.restoreConsole;
const outputContains = helpers.outputContains;
const eOutputContains = helpers.eOutputContains;
const noWarn = helpers.noWarn;
const noError = helpers.noError;
const fixturify = require('fixturify');

process.setMaxListeners(0);

beforeEach(() => {
  teardownTestDir();
  prepareTestDir();
  spyOnConsole();
});

afterEach(() => {
  restoreConsole();
  teardownTestDir();
});

const postcssBrunch = {
  'package.json': `{
    "name": "postcss-brunch",
    "version": "0.1.0"
  }`,
  'index.js': `'use strict';
    class PostCSSCompiler {
      compile(file) {
        const data = file.data.replace('backdrop', '-webkit-$&');

        return Promise.resolve({data});
      }
    }

    Object.assign(PostCSSCompiler.prototype, {
      brunchPlugin: true,
      type: 'stylesheet',
      extension: 'css',
    });

    module.exports = PostCSSCompiler;
  `,
};

it('plugins order', done => {
  fixturify.writeSync('.', {
    'package.json': `{
      "name": "brunch-app",
      "version": "0.1.0",
      "devDependencies": {
        "javascript-brunch": "^2.0.0",
        "babel-brunch": "^6.0.4",
        "terser-brunch": "^4.0.0",
        "gzip-brunch": "^2.0.0"
      }
    }`,
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      },
      plugins: {
        order: {
          before: ['babel-brunch'],
          after: ['gzip-brunch']
        }
      }
    };`,
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'console.log("hello world")',
    },
  });

  brunch.build({onCompile() {
    fileExists('public/app.js');
    done();
  }});
});

it('plugins order missing', done => {
  fixturify.writeSync('.', {
    'package.json': `{
      "name": "brunch-app",
      "version": "0.1.0",
      "devDependencies": {
        "javascript-brunch": "^2.0.0",
        "babel-brunch": "^6.0.4",
        "terser-brunch": "^4.0.0",
        "gzip-brunch": "^2.0.0"
      }
    }`,
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      },
      plugins: {
        order: {
          before: ['missing'],
        }
      }
    };`,
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'console.log("hello world")',
    },
  });

  brunch.build({onCompile() {
    eOutputContains("Plugin 'missing' is found in 'plugins.order', but is not declared in package.json");
    done();
  }});
});

it('compiler chaining: compiler.targetExtension', done => {
  fixturify.writeSync('.', {
    'package.json': `{
      "name": "brunch-app",
      "version": "0.1.0",
      "devDependencies": {
        "sass-brunch": "file:sass-brunch",
        "postcss-brunch": "file:postcss-brunch"
      }
    }`,
    'brunch-config.js': `module.exports = {
      files: {
        stylesheets: {
          joinTo: 'style.css'
        }
      }
    }`,
    app: {
      'style.sass': 'header\n\tbackdrop-filter: blur(10px)',
    },
    'sass-brunch': {
      'package.json': `{
        "name": "sass-brunch",
        "version": "0.1.0"
      }`,
      'index.js': `'use strict';
        class SassCompiler {
          compile(file) {
            const data = file.data.replace(/\\t/, '{') + ';}';

            return Promise.resolve({data});
          }
        }

        Object.assign(SassCompiler.prototype, {
          brunchPlugin: true,
          type: 'stylesheet',
          extension: 'sass',
          targetExtension: 'css',
        });

        module.exports = SassCompiler;
      `,
    },
    'postcss-brunch': postcssBrunch,
  });

  brunch.build({onCompile() {
    fileExists('public/style.css');
    fileContains('public/style.css', '{-webkit-backdrop');

    noWarn();
    noError();
    done();
  }});
});

it('compileStatic changes path', done => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {},
    }`,
    app: {
      assets: {
        'test.emp': 'Hello, world!',
      },
    },
    'package.json': `{
      "name": "brunch-app",
      "version": "0.1.0",
      "devDependencies": {
        "compiler-brunch": "file:compiler-brunch"
      }
    }`,
    'compiler-brunch': {
      'package.json': `{
        "name": "compiler-brunch",
        "version": "0.1.0"
      }`,
      'index.js': `'use strict';
        class Compiler {
          compileStatic(file) {
            const data = file.data;
            const path = file.path.replace('test', 'hello');
            return Promise.resolve({data, path});
          }
        }

        Object.assign(Compiler.prototype, {
          brunchPlugin: true,
          type: 'template',
          extension: 'emp',
          staticTargetExtension: 'built',
        });

        module.exports = Compiler;
      `,
    },
  });

  brunch.build({onCompile() {
    fileDoesNotExist('public/test.built');
    fileExists('public/hello.built');
    fileEquals('public/hello.built', 'Hello, world!');
    done();
  }});
});

it('compiler chaining: returning path', done => {
  fixturify.writeSync('.', {
    'package.json': `{
      "name": "brunch-app",
      "version": "0.1.0",
      "dependencies": {},
      "devDependencies": {
        "sass-brunch": "file:sass-brunch",
        "postcss-brunch": "file:postcss-brunch"
      }
    }`,
    'brunch-config.js': `module.exports = {
      files: {
        stylesheets: {
          joinTo: 'style.css'
        }
      }
    }`,
    app: {
      'style2.sass': 'header\n\tbackdrop-filter: blur(10px)',
    },
    'sass-brunch': {
      'package.json': `{
        "name": "sass-brunch",
        "version": "0.1.0"
      }`,
      'index.js': `'use strict';
        class SassCompiler {
          compile(file) {
            const data = file.data.replace(/\\t/, '{') + ';}';
            const path = file.path.replace(/sass$/, 'css');

            return Promise.resolve({data, path});
          }
        }

        Object.assign(SassCompiler.prototype, {
          brunchPlugin: true,
          type: 'stylesheet',
          extension: 'sass',
        });

        module.exports = SassCompiler;
      `,
    },
    'postcss-brunch': postcssBrunch,
  });

  brunch.build({onCompile() {
    fileExists('public/style.css');
    fileContains('public/style.css', '{-webkit-backdrop');

    noWarn();
    noError();

    done();
  }});
});

it('basic build', done => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'console.log("hello world")',
    },
  });

  brunch.build({onCompile() {
    fileExists('public/app.js.map');
    fileContains('public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains('public/app.js', `
require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);

    fileContains('public/index.html', '<h1>hello world</h1>');

    outputContains('compiled initialize.js into app.js, copied index.html');
    noWarn();
    noError();

    done();
  }});
});

it('basic file joining', done => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'a.js': 'filea',
      'b.js': 'fileb',
      'c.js': 'filec',
    },
  });

  brunch.build({onCompile() {
    fileExists('public/app.js.map');
    fileContains('public/index.html', '<h1>hello world</h1>');
    fileContains('public/app.js', `require.register("a.js", function(exports, require, module) {
filea
});

;require.register("b.js", function(exports, require, module) {
fileb
});

;require.register("c.js", function(exports, require, module) {
filec
});
`);

    outputContains('compiled 3 files into app.js, copied index.html');
    noWarn();
    noError();

    done();
  }});
});

it('multi file output', done => {
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
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'a.js': 'filea',
      'b.js': 'fileb',
      'c.js': 'filec',
    },
    vendor: {
      'a.js': 'vendora',
      'b.js': 'vendorb',
      'c.js': 'vendorc',
    },
  });

  brunch.build({onCompile() {
    fileExists('public/javascripts/app.js.map');
    fileExists('public/javascripts/vendor.js.map');
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
    fileContains('public/javascripts/app.js', appJs);
    fileDoesNotContain('public/javascripts/app.js', vendorJs);
    fileContains('public/javascripts/vendor.js', vendorJs);
    fileDoesNotContain('public/javascripts/vendor.js', appJs);
    fileDoesNotContain('public/javascripts/vendor.js', 'require.register("');
    fileContains('public/index.html', '<h1>hello world</h1>');

    outputContains('compiled 3 files into 2 files, copied index.html');
    noWarn();
    noError();

    done();
  }});
});

it('entry points', done => {
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
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'require("./c"); initialize',
      'c.js': 'require("b"); filec',
      'b.js': 'require("a"); fileb',
      'a.js': 'filea',
      'not-required.js': 'notrequired',
    },
  });

  brunch.build({onCompile() {
    fileExists('public/bundle.js.map');
    fileContains('public/bundle.js', '//# sourceMappingURL=bundle.js.map');
    fileDoesNotContain('public/bundle.js', `notrequired`);
    fileContains('public/bundle.js', `require.register("a.js", function(exports, require, module) {
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

    fileContains('public/index.html', '<h1>hello world</h1>');

    outputContains('compiled 4 files into bundle.js, copied index.html');
    eOutputContains('app/not-required.js compiled, but not written');
    noError();

    // done();
    done();
  }});
});

it('multi entry points', done => {
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
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'entry1.js': 'require("./a"); entry1',
      'entry2.js': 'require("./c"); entry2',
      'a.js': 'require("./b"); filea',
      'b.js': 'fileb',
      'c.js': 'require("./d"); filec',
      'd.js': 'filed',
      'not-required.js': 'notrequired',
    },
  });

  brunch.build({onCompile() {
    fileExists('public/bundle1.js.map');
    fileExists('public/bundle2.js.map');
    fileContains('public/bundle1.js', '//# sourceMappingURL=bundle1.js.map');
    fileContains('public/bundle2.js', '//# sourceMappingURL=bundle2.js.map');
    fileDoesNotContain('public/bundle1.js', `notrequired`);
    fileDoesNotContain('public/bundle2.js', `notrequired`);
    fileContains('public/bundle1.js', `require.register("a.js", function(exports, require, module) {
require("./b"); filea
});

;require.register("b.js", function(exports, require, module) {
fileb
});

;require.register("entry1.js", function(exports, require, module) {
require("./a"); entry1
});`);

    fileContains('public/bundle2.js', `require.register("c.js", function(exports, require, module) {
require("./d"); filec
});

;require.register("d.js", function(exports, require, module) {
filed
});

;require.register("entry2.js", function(exports, require, module) {
require("./c"); entry2
});`);

    fileContains('public/index.html', '<h1>hello world</h1>');

    outputContains('compiled 6 files into 2 files, copied index.html');
    eOutputContains('app/not-required.js compiled, but not written');
    noError();

    // done();
    done();
  }});
});

it('customize paths.public config', done => {
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
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'console.log("hello world")',
    },
  });

  brunch.build({onCompile() {
    fileExists('dist/app.js.map');
    fileContains('dist/index.html', '<h1>hello world</h1>');
    fileContains('dist/app.js', 'console.log("hello world")');

    outputContains('compiled initialize.js into app.js, copied index.html');
    // in tests, this case will have a warning due to EventEmitter leak. Does not happen outside of tests, though.
    noError();

    done();
  }});
});

it('npm integration', done => {
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
    app: {
      'meaning.js': 'module.exports = 42;',
      'initialize.js': `
        var React = require('react');
        var ReactDOM = require('react-dom');
        var socrates = require('socrates');
        require('./meaning.js');
        require('bignumber.js');
      `,
    },
  });

  npmInstall(() => {
    brunch.build({onCompile() {
      const contains = text => fileContains('public/app.js', text);
      const doesntContain = text => fileDoesNotContain('public/app.js', text);

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

      outputContains(/compiled (\d{3}) files into app\.js/);
      noError();

      done();
    }});
  });
});

it('compiling npm packages', done => {
  fixturify.writeSync('.', {
    'package.json': `
      {
        "dependencies": {
          "credit-card": "2.0.0"
        },
        "devDependencies": {
          "javascript-brunch": "^2.0.0",
          "babel-brunch": "^6.0.4",
          "babel-preset-es2015": "^6.0.0",
          "babel-preset-es2016": "^6.0.0",
          "babel-plugin-syntax-exponentiation-operator": "^6.0.0"
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
    app: {
      'initialize.js': `
        var cc = require('credit-card');
      `,
    },
  });

  npmInstall(() => {
    brunch.build({onCompile() {
      const contains = text => fileContains('public/app.js', text);
      const doesntContain = text => fileDoesNotContain('public/app.js', text);

      // credit-card is compiled, too
      doesntContain('const Reach');
      contains('var Reach');

      outputContains('compiled 2 files into app.js');
      noWarn();
      noError();

      done();
    }});
  });
});

it('config override', done => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      overrides: {
        custom: {
          paths: {
            public: 'dist'
          }
        }
      },
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'console.log("hello world")',
    },
  });

  brunch.build({env: 'custom', onCompile() {
    fileExists('dist/app.js.map');
    fileContains('dist/index.html', '<h1>hello world</h1>');
    fileContains('dist/app.js', 'console.log("hello world")');
    done();
  }});
});

it('modules.definition option', done => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      npm: {
        enabled: false
      },
      modules: {
        definition: false,
        wrapper: function(path, data) {
          return "(function() {" + data + "})()";
        }
      },
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'console.log("hello world")',
    },
  });

  brunch.build({onCompile() {
    fileExists('public/app.js.map');
    fileEquals('public/app.js', '(function() {console.log("hello world")\n})();\n//# sourceMappingURL=app.js.map');
    fileContains('public/index.html', '<h1>hello world</h1>');

    outputContains('compiled initialize.js into app.js, copied index.html');
    noWarn();
    noError();

    done();
  }});
});

const TempCompiler = {
  'package.json': `{
    "name": "brunch-app",
    "description": "Description",
    "author": "Your Name",
    "version": "0.1.0",
    "devDependencies": {
      "temp-brunch": "file:temp-brunch"
    }
  }`,
  'temp-brunch': {
    'package.json': `{
      "name": "temp-brunch",
      "version": "0.0.1",
      "main": "index.js"
    }`,
    'index.js': `'use strict';
      class TempCompiler {
        compile(file) {
          const compiled = file.data.replace(/-/g, '^');
          return Promise.resolve(compiled);
        }
        compileStatic(file) {
          return this.compile(file);
        }
      }

      TempCompiler.prototype.brunchPlugin = true;
      TempCompiler.prototype.type = 'template';
      TempCompiler.prototype.extension = 'emp';
      TempCompiler.prototype.staticTargetExtension = 'built';

      module.exports = TempCompiler;
    `,
  },
};

it('static compilation', done => {
  const files = {
    'brunch-config.js': `module.exports = {
      files: {}
    };`,
    app: {
      assets: {
        'test.emp': 'Some-stuff-is-better-expressed-with-dashes.-Oh-wait-or-should-it-be-carets?',
      },
    },
  };

  fixturify.writeSync('.', Object.assign(files, TempCompiler));

  brunch.build({onCompile() {
    fileDoesNotExist('public/test.emp');
    fileExists('public/test.built');
    fileEquals('public/test.built', 'Some^stuff^is^better^expressed^with^dashes.^Oh^wait^or^should^it^be^carets?');
    done();
  }});
});

it('join templates according to joinTo option', done => {
  const files = {
    'brunch-config.js': `module.exports = {
      files: {
        templates: {
          joinTo: 'all.js'
        }
      }
    };`,
    app: {
      'a.emp': 'hello-world',
      'b.emp': 'module-exports',
    },
  };

  fixturify.writeSync('.', Object.assign(files, TempCompiler));

  brunch.build({onCompile() {
    fileDoesNotExist('public/a.emp');
    fileDoesNotExist('public/b.built');
    fileContains('public/all.js', 'hello^world');
    fileContains('public/all.js', 'module^exports');
    done();
  }});
});

it('reuse javascripts.joinTo for templates.joinTo', done => {
  const files = {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'all.js'
        }
      }
    };`,
    app: {
      'a.emp': 'hello-world',
      'b.emp': 'module-exports',
    },
  };

  fixturify.writeSync('.', Object.assign(files, TempCompiler));

  brunch.build({onCompile() {
    fileContains('public/all.js', 'hello^world');
    fileContains('public/all.js', 'module^exports');
    done();
  }});
});

it('reuse javascripts.joinTo only if templates.joinTo are empty', done => {
  const files = {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'scripts.js'
        },
        templates: {
          joinTo: 'templates.js'
        }
      }
    };`,
    app: {
      'a.emp': 'hello-world',
      'b.emp': 'module-exports',
    },
  };

  fixturify.writeSync('.', Object.assign(files, TempCompiler));

  brunch.build({onCompile() {
    fileContains('public/templates.js', 'hello^world');
    fileContains('public/templates.js', 'module^exports');
    done();
  }});
});

it('inline source maps', done => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      sourceMaps: 'inline',
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    app: {
      'initialize.js': 'console.log("hello world")',
    },
  });

  brunch.build({onCompile() {
    fileDoesNotExist('public/app.js.map');
    fileContains('public/app.js', '//# sourceMappingURL=data:application/json;charset=utf-8;base64,');

    noWarn();
    noError();

    done();
  }});
});

it('include getter', done => {
  fixturify.writeSync('.', {
    'package.json': `{
      "name": "brunch-app",
      "description": "Description",
      "author": "Your Name",
      "version": "0.1.0",
      "dependencies": {},
      "devDependencies": {
        "javascript-brunch": "^2.0.0",
        "include-brunch": "file:include-brunch"
      }
    }`,
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    'include-brunch': {
      'package.json': `{
        "name": "include-brunch",
        "version": "0.1.0",
        "main": "index.js"
      }`,
      'index.js': `'use strict';
        class IncludeCompiler {
          compile(file) {
            return Promise.resolve(file);
          }
          get include() {
            return [ __dirname + '/pow.js' ];
          }
        }
        Object.assign(IncludeCompiler.prototype, {
          brunchPlugin: true,
          type: 'javascript',
          extension: 'js'
        });
        module.exports = IncludeCompiler;
      `,
      'pow.js': 'window.pow = Math.pow;',
    },
  });

  brunch.build({onCompile() {
    fileExists('public/app.js');
    fileContains('public/app.js', 'Math.pow');
    done();
  }});
});
