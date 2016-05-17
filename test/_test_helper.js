const path = require('path');
const fs = require('fs-extra');
const cp = require('child_process');

const rootPath = process.cwd();
const tmp = path.join(require('os').tmpDir(), 'brunch-tests');

const createPackageJson = function() {
  const minimalJson = `{
    "name": "brunch-app",
    "description": "Description",
    "author": "Your Name",
    "version": "0.1.0",
    "dependencies": {},
    "devDependencies": {
      "javascript-brunch": "^2.0.0"
    }
  }`;

  fs.writeFileSync('package.json', minimalJson);
};

const createBowerJson = function() {
  const minimalJson = `{
    "name": "brunch-app",
    "description": "Description",
    "main": "",
    "authors": ["Your Name"],
    "license": "MIT",
    "homepage": "",
    "ignore": [
      "**/.*",
      "node_modules",
      "bower_components",
      "test",
      "tests"
    ],
    "dependencies": {},
    "devDependencies": {}
  }`;

  fs.writeFileSync('bower.json', minimalJson);
  fs.mkdirSync('bower_components');
};

module.exports.prepareTestDir = function prepareTestDir() {
  fs.mkdirsSync(tmp);
  process.chdir(tmp);
  createPackageJson();
  createBowerJson();
};

module.exports.teardownTestDir = function teardownTestDir() {
  process.chdir(rootPath);
  fs.removeSync(tmp);
};

module.exports.fileExists = function fileExists(t, path) {
  try {
    fs.accessSync(path, fs.F_OK);
    t.pass();
  } catch (e) {
    t.fail(e.message);
  }
};

module.exports.fileDoesNotExist = function fileDoesNotExist(t, path) {
  try {
    fs.accessSync(path, fs.F_OK);
    t.fail(`File ${path} should not exist`);
  } catch (e) {
    t.pass();
  }
};

module.exports.fileContains = function fileContains(t, path, content) {
  try {
    t.true(fs.readFileSync(path, 'utf8').includes(content));
  } catch (e) {
    t.fail(e.message);
  }
};

module.exports.fileEquals = function fileEquals(t, path, content) {
  try {
    t.is(fs.readFileSync(path, 'utf8'), content);
  } catch (e) {
    t.fail(e.message);
  }
};

module.exports.fileDoesNotContains = function fileDoesNotContains(t, path, content) {
  try {
    t.false(fs.readFileSync(path, 'utf8').includes(content));
  } catch (e) {
    t.fail(e.message);
  }
};

const _stdout = require('test-console').stdout;
const _stderr = require('test-console').stderr;
var _inspect, _inspectE;

module.exports.spyOnConsole = function() {
  _inspect = _stdout.inspect();
  _inspectE = _stderr.inspect();
};

module.exports.restoreConsole = function() {
  _inspect.restore();
  _inspect.output.forEach(line => process.stdout.write(line));
  _inspect = null;

  _inspectE.restore();
  _inspectE.output.forEach(line => process.stderr.write(line));
  _inspectE = null;
};

module.exports.outputContains = function(t, string) {
  if (_inspect.output.join('\n').indexOf(string) !== -1) {
    t.pass();
  } else {
    t.fail(`Expected console output (stdout) to contain '${string}' but it didn't`);
  }
};

module.exports.outputDoesNotContain = function(t, string) {
  if (_inspect.output.join('\n').indexOf(string) === -1) {
    t.pass();
  } else {
    t.fail(`Expected console output (stdout) not to contain '${string}' but it did`);
  }
};

module.exports.eOutputContains = function(t, string) {
  if (_inspectE.output.join('\n').indexOf(string) !== -1) {
    t.pass();
  } else {
    t.fail(`Expected console output (stderr) to contain '${string}' but it didn't`);
  }
};

module.exports.eOutputDoesNotContain = function(t, string) {
  if (_inspectE.output.join('\n').indexOf(string) === -1) {
    t.pass();
  } else {
    t.fail(`Expected console output (stderr) not to contain '${string}' but it did`);
  }
};

module.exports.noWarn = t => module.exports.eOutputDoesNotContain(t, 'warn');
module.exports.noError = t => module.exports.eOutputDoesNotContain(t, 'error');

module.exports.requestBrunchServer = function requestBrunchServer(path, callback) {
  const http = require('http');
  const options = {
    host: 'localhost',
    port: 3333,
    path: path
  };

  http.request(options, response => {
    var responseText = '';
    response.on('data', chunk => responseText += chunk);
    response.on('end', () => callback(responseText));
  }).end();
};

module.exports.npmInstall = function(cb) {
  cp.exec('npm install', cb);
};
