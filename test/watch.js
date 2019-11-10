'use strict';
const fs = require('fs');
const {expect} = require('chai');
const brunch = require('../lib');
const helpers = require('./_utils');
const prepareTestDir = helpers.prepareTestDir;
const teardownTestDir = helpers.teardownTestDir;
const fileContains = helpers.fileContains;
const fileDoesNotContain = helpers.fileDoesNotContain;
const fileExists = helpers.fileExists;
const fileDoesNotExist = helpers.fileDoesNotExist;
const requestBrunchServer = helpers.requestBrunchServer;
const fixturify = require('fixturify');

let watcher;

const EventEmitter = require('events');
const tearDownInterval = 1000;

const watch = (params, fn) => {
  const compileEmitter = new EventEmitter();
  const onCompile = () => {
    compileEmitter.emit('compiled');
  };

  const compilation = () => {
    compileEmitter.once('compiled', () => it.next());
  };

  params._onReload = newWatcher => {
    watcher = newWatcher;
  };
  params.onCompile = onCompile;
  watcher = brunch.watch(params);

  const it = fn(compilation);
  it.next();
};

beforeEach(() => {
  teardownTestDir();
  prepareTestDir();
});

afterEach(done => {
  (async function() {
    if (watcher) {
      await watcher.close();
    }
    setTimeout(() => {
      teardownTestDir();
      done();
    }, tearDownInterval);
  })();
});

it('compile on file changes', done => {
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

  watch({}, function* (compilation) {
    yield compilation();
    fileExists('public/app.js.map');
    fileContains('public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains('public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);
    fileContains('public/index.html', '<h1>hello world</h1>');

    fs.writeFileSync('app/initialize.js', 'console.log("changed")');

    yield compilation();
    fileExists('public/app.js.map');
    fileContains('public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains('public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("changed")
});`);
    fileContains('public/index.html', '<h1>hello world</h1>');
    done();
  });
});

it('detect file addition', done => {
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

  watch({}, function* (compilation) {
    yield compilation();
    fileExists('public/app.js.map');
    fileContains('public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains('public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);
    fileContains('public/index.html', '<h1>hello world</h1>');

    fs.writeFileSync('app/new-file.js', 'console.log("new")');

    yield compilation();
    fileExists('public/app.js.map');
    fileContains('public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains('public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);
    fileContains('public/index.html', '<h1>hello world</h1>');
    fileContains('public/app.js', `require.register("new-file.js", function(exports, require, module) {
console.log("new")
});`);
    done();
  });
});

it('detect file removal', done => {
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
    },
  });

  watch({}, function* (compilation) {
    yield compilation();
    fileExists('public/app.js.map');
    fileContains('public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains('public/app.js', `require.register("a.js", function(exports, require, module) {
filea
});`);
    fileContains('public/app.js', `require.register("b.js", function(exports, require, module) {
fileb
});`);
    fileContains('public/index.html', '<h1>hello world</h1>');

    fs.unlinkSync('app/b.js');

    yield compilation();
    fileExists('public/app.js.map');
    fileContains('public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains('public/app.js', `require.register("a.js", function(exports, require, module) {
filea
});`);
    fileDoesNotContain('public/app.js', `require.register("b.js", function(exports, require, module) {
fileb
});`);
    fileContains('public/index.html', '<h1>hello world</h1>');
    done();
  });
});

it('install npm packages if package.json changes', done => {
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

  watch({}, function* (compilation) {
    yield compilation();
    expect(fs.readdirSync('./node_modules').includes('lodash')).to.be.false;
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    packageJson.dependencies.lodash = '*';
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

    yield compilation();
    expect(fs.readdirSync('./node_modules').includes('lodash')).to.be.true;
    done();
  });
});

it('reload config if it changes', done => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      },
      paths: {
        public: 'public'
      }
    };`,
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'console.log("hello world")',
    },
  });

  watch({}, function* (compilation) {
    yield compilation();
    fileDoesNotExist('dist/app.js.map');
    fileDoesNotExist('dist/app.js');
    fileDoesNotExist('dist/index.html');
    fileExists('public/app.js.map');
    fileExists('public/app.js');
    fileExists('public/index.html');
    fs.writeFileSync('brunch-config.js', `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      },
      paths: {
        public: 'dist'
      }
    };`);

    yield compilation();
    fileExists('dist/app.js.map');
    fileExists('dist/app.js');
    fileExists('dist/index.html');
    done();
  });
});

it('brunch server works', done => {
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

  watch({server: true}, function* (compilation) {
    yield compilation();
    requestBrunchServer('/', responseText => {
      expect(responseText).to.equal('<h1>hello world</h1>');
      done();
    });
  });
});

it('brunch server reload files', done => {
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

  watch({server: true}, function* (compilation) {
    yield compilation();
    requestBrunchServer('/', responseText => {
      expect(responseText).to.equal('<h1>hello world</h1>');
      fs.writeFileSync('app/assets/index.html', '<h1>changed</h1>');
    });

    yield compilation();
    requestBrunchServer('/', responseText => {
      expect(responseText).to.equal('<h1>changed</h1>');
      done();
    });
  });
});

it('brunch server accepts custom server 1', done => {
  fixturify.writeSync('.', {
    'brunch-config.js': `module.exports = {
      files: {
        javascripts: {
          joinTo: 'app.js'
        }
      }
    };`,
    'brunch-server.js': `
var http = require('http');

module.exports = {
  startServer: function(port, path, callback) {
    var server = http.createServer(function (req, res) {
      res.end('hello from custom server');
    });
    return server.listen(port, function() { callback(undefined, server); });
  }
};`,
    app: {
      assets: {
        'index.html': '<h1>hello world</h1>',
      },
      'initialize.js': 'console.log("hello world")',
    },
  });

  watch({server: true}, function* (compilation) {
    yield compilation();
    requestBrunchServer('/', responseText => {
      expect(responseText).to.equal('hello from custom server');
      done();
    });
  });
});
