'use strict';
const test = require('ava');
const fs = require('fs');
const brunch = require('../lib');
const helpers = require('./_test_helper');
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
  watcher = brunch.watch(params, onCompile);

  const it = fn(compilation);
  it.next();
};

const closeWatcher = cb => {
  if (watcher) {
    // close chokidar to prevent that it understands the fixtures being copied as new files being added
    watcher.watcher.close();
    if (watcher.server) {
      return watcher.server.close(cb);
    }
  }
  return cb();
};

test.beforeEach(() => {
  teardownTestDir();
  prepareTestDir();
});

test.afterEach.always.cb(t => {
  closeWatcher(() => {
    setTimeout(() => {
      teardownTestDir();
      t.end();
    }, tearDownInterval);
  });
});

test.serial.cb('compile on file changes', t => {
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
    fileExists(t, 'public/app.js.map');
    fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains(t, 'public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);
    fileContains(t, 'public/index.html', '<h1>hello world</h1>');

    fs.writeFileSync('app/initialize.js', 'console.log("changed")');

    yield compilation();
    fileExists(t, 'public/app.js.map');
    fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains(t, 'public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("changed")
});`);
    fileContains(t, 'public/index.html', '<h1>hello world</h1>');
    t.end();
  });
});

test.serial.cb('detect file addition', t => {
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
    fileExists(t, 'public/app.js.map');
    fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains(t, 'public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);
    fileContains(t, 'public/index.html', '<h1>hello world</h1>');

    fs.writeFileSync('app/new-file.js', 'console.log("new")');

    yield compilation();
    fileExists(t, 'public/app.js.map');
    fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains(t, 'public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);
    fileContains(t, 'public/index.html', '<h1>hello world</h1>');
    fileContains(t, 'public/app.js', `require.register("new-file.js", function(exports, require, module) {
console.log("new")
});`);
    t.end();
  });
});

test.serial.cb('detect file removal', t => {
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
    fileExists(t, 'public/app.js.map');
    fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains(t, 'public/app.js', `require.register("a.js", function(exports, require, module) {
filea
});`);
    fileContains(t, 'public/app.js', `require.register("b.js", function(exports, require, module) {
fileb
});`);
    fileContains(t, 'public/index.html', '<h1>hello world</h1>');

    fs.unlinkSync('app/b.js');

    yield compilation();
    fileExists(t, 'public/app.js.map');
    fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
    fileContains(t, 'public/app.js', `require.register("a.js", function(exports, require, module) {
filea
});`);
    fileDoesNotContain(t, 'public/app.js', `require.register("b.js", function(exports, require, module) {
fileb
});`);
    fileContains(t, 'public/index.html', '<h1>hello world</h1>');
    t.end();
  });
});

test.serial.cb('install npm packages if package.json changes', t => {
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
    t.false(fs.readdirSync('./node_modules').includes('lodash'));

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    packageJson.dependencies.lodash = '*';
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

    yield compilation();
    t.true(fs.readdirSync('./node_modules').includes('lodash'));
    t.end();
  });
});

test.serial.cb('install bower components if bower.json changes', t => {
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
    t.false(fs.readdirSync('./bower_components').includes('jquery'));

    const bowerJson = JSON.parse(fs.readFileSync('bower.json', 'utf8'));
    bowerJson.dependencies.jquery = '*';
    fs.writeFileSync('bower.json', JSON.stringify(bowerJson, null, 2));

    yield compilation();
    t.true(fs.readdirSync('./bower_components').includes('jquery'));
    t.end();
  });
});

test.serial.cb('reload config if it changes', t => {
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
    fileDoesNotExist(t, 'dist/app.js.map');
    fileDoesNotExist(t, 'dist/app.js');
    fileDoesNotExist(t, 'dist/index.html');
    fileExists(t, 'public/app.js.map');
    fileExists(t, 'public/app.js');
    fileExists(t, 'public/index.html');
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
    fileExists(t, 'dist/app.js.map');
    fileExists(t, 'dist/app.js');
    fileExists(t, 'dist/index.html');
    t.end();
  });
});

test.serial.cb('brunch server works', t => {
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
      t.is(responseText, '<h1>hello world</h1>');
      t.end();
    });
  });
});

test.serial.cb('brunch server reload files', t => {
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
      t.is(responseText, '<h1>hello world</h1>');
      fs.writeFileSync('app/assets/index.html', '<h1>changed</h1>');
    });

    yield compilation();
    requestBrunchServer('/', responseText => {
      t.is(responseText, '<h1>changed</h1>');
      t.end();
    });
  });
});

test.serial.cb('brunch server accepts custom server', t => {
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
    const server = http.createServer(function (req, res) {
      res.end('hello from custom server');
    });
    return server.listen(port, callback);
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
      t.is(responseText, 'hello from custom server');
      t.end();
    });
  });
});
