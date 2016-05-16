const path = require('path');
const fs = require('fs-extra');

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

module.exports.fileDoesNotExists = function fileDoesNotExists(t, path) {
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
