const test = require('ava');
const fs = require('fs');
const brunch = require('../lib');
const {
  prepareTestDir,
  teardownTestDir,
  fileContains,
  fileDoesNotContains,
  fileExists,
  fileDoesNotExists,
  requestBrunchServer
} = require('./_test_helper');
const fixturify = require('fixturify');

var watcher;

const watch = function(...args) {
  watcher = brunch.watch(...args);
};

test.beforeEach.cb((t) => {
  teardownTestDir();
  prepareTestDir();

  if (watcher) {
    // close chokidar to prevent that it understands the fixtures being copied as new files being added
    watcher.watcher.close();
    if (watcher.server) {
      watcher.server.close(t.end);
    } else {
      t.end();
    }
  } else {
    t.end();
  }
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
      fileExists(t, 'public/app.js.map');
      fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
      fileContains(t, 'public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);
      fileContains(t, 'public/index.html', '<h1>hello world</h1>');

      fs.writeFileSync('app/initialize.js', 'console.log("changed")');
    } else if (calls === 2) {
      fileExists(t, 'public/app.js.map');
      fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
      fileContains(t, 'public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("changed")
});`);
      fileContains(t, 'public/index.html', '<h1>hello world</h1>');
      t.end();
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({}, onCompile);
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
      fileExists(t, 'public/app.js.map');
      fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
      fileContains(t, 'public/app.js', `require.register("initialize.js", function(exports, require, module) {
console.log("hello world")
});`);
      fileContains(t, 'public/index.html', '<h1>hello world</h1>');

      fs.writeFileSync('app/new-file.js', 'console.log("new")');
    } else if (calls === 2) {
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
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({}, onCompile);
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'a.js': 'filea',
      'b.js': 'fileb'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
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
    } else if (calls === 2) {
      fileExists(t, 'public/app.js.map');
      fileContains(t, 'public/app.js', '//# sourceMappingURL=app.js.map');
      fileContains(t, 'public/app.js', `require.register("a.js", function(exports, require, module) {
filea
});`);
      fileDoesNotContains(t, 'public/app.js', `require.register("b.js", function(exports, require, module) {
fileb
});`);
      fileContains(t, 'public/index.html', '<h1>hello world</h1>');
      t.end();
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({}, onCompile);
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
      t.true(fs.readdirSync('./node_modules').indexOf('lodash') === -1);

      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      packageJson.dependencies.lodash = '*';
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    } else if (calls === 2) {
      t.true(fs.readdirSync('./node_modules').indexOf('lodash') !== -1);
      t.end();
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({}, onCompile);
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
      t.true(fs.readdirSync('./bower_components').indexOf('jquery') === -1);

      const bowerJson = JSON.parse(fs.readFileSync('bower.json', 'utf8'));
      bowerJson.dependencies.jquery = '*';
      fs.writeFileSync('bower.json', JSON.stringify(bowerJson, null, 2));
    } else if (calls === 2) {
      t.true(fs.readdirSync('./bower_components').indexOf('jquery') !== -1);
      t.end();
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({}, onCompile);
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
      fileDoesNotExists(t, 'dist/app.js.map');
      fileDoesNotExists(t, 'dist/app.js');
      fileDoesNotExists(t, 'dist/index.html');
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
    } else if (calls === 2) {
      fileExists(t, 'dist/app.js.map');
      fileExists(t, 'dist/app.js');
      fileExists(t, 'dist/index.html');
      t.end();
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({}, onCompile);
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
      requestBrunchServer('/', (responseText) => {
        t.is(responseText, '<h1>hello world</h1>');
        t.end();
      });
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({ server: true }, onCompile);
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
      requestBrunchServer('/', (responseText) => {
        t.is(responseText, '<h1>hello world</h1>');
        fs.writeFileSync('app/assets/index.html', '<h1>changed</h1>');
      });
    } else if (calls === 2) {
      requestBrunchServer('/', (responseText) => {
        t.is(responseText, '<h1>changed</h1>');
        t.end();
      });
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({ server: true }, onCompile);
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
    'app': {
      'assets': {
        'index.html': '<h1>hello world</h1>'
      },
      'initialize.js': 'console.log("hello world")'
    }
  });

  var calls = 0;

  const onCompile = function() {
    calls++;

    if (calls === 1) {
      requestBrunchServer('/', (responseText) => {
        t.is(responseText, 'hello from custom server');
        t.end();
      });
    } else {
      t.fail(`Unexpected number of calls ${calls}`);
    }
  };

  watch({ server: true }, onCompile);
});
