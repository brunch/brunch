const test = require('ava');
const fs = require('fs');
const brunch = require('../lib');
const {
  prepareTestDir,
  teardownTestDir,
  fileContains,
  fileDoesNotContains,
  fileExists
} = require('./_test_helper');
const fixturify = require('fixturify');

var watcher;

const watch = function(...args) {
  watcher = brunch.watch(...args);
};

test.beforeEach(() => {
  teardownTestDir();
  prepareTestDir();

  if (watcher) {
    // close chokidar to prevent that it understands the fixtures being copied as new files being added
    watcher.watcher.close();
    watcher = null;
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
