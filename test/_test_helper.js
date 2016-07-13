'use strict';
const path = require('path');
const fs = require('fs-extra');
const cp = require('child_process');

const rootPath = process.cwd();
const tmp = path.join(require('os').tmpDir(), 'brunch-tests');

const createPackageJson = () => {
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

const createBowerJson = () => {
  const minimalJson = `{
    "name": "brunch-app",
    "description": "Description",
    "main": "",
    "authors": "Your Name",
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

const prepareTestDir = () => {
  fs.mkdirsSync(tmp);
  process.chdir(tmp);
  createPackageJson();
  createBowerJson();
};

const teardownTestDir = () => {
  process.chdir(rootPath);
  fs.removeSync(tmp);
};

const fileExists = (t, path) => {
  try {
    fs.accessSync(path, fs.F_OK);
    t.pass();
  } catch (e) {
    t.fail(e.message);
  }
};

const fileDoesNotExist = (t, path) => {
  try {
    fs.accessSync(path, fs.F_OK);
    t.fail(`File ${path} should not exist`);
  } catch (e) {
    t.pass();
  }
};

const fileContains = (t, path, content) => {
  try {
    t.true(fs.readFileSync(path, 'utf8').includes(content));
  } catch (e) {
    t.fail(e.message);
  }
};

const fileEquals = (t, path, content) => {
  try {
    t.is(fs.readFileSync(path, 'utf8'), content);
  } catch (e) {
    t.fail(e.message);
  }
};

const fileDoesNotContain = (t, path, content) => {
  try {
    t.false(fs.readFileSync(path, 'utf8').includes(content));
  } catch (e) {
    t.fail(e.message);
  }
};

const _stdout = require('test-console').stdout;
const _stderr = require('test-console').stderr;
let _inspect, _inspectE;

const spyOnConsole = () => {
  _inspect = _stdout.inspect();
  _inspectE = _stderr.inspect();
};

const restoreConsole = () => {
  _inspect.restore();
  _inspect.output.forEach(line => process.stdout.write(line));
  _inspect = null;

  _inspectE.restore();
  _inspectE.output.forEach(line => process.stderr.write(line));
  _inspectE = null;
};

const outputContains = (t, msg) => {
  if (typeof msg === 'string') {
    if (_inspect.output.join('\n').includes(msg)) {
      t.pass();
    } else {
      t.fail(`Expected console output (stdout) to contain '${msg}' but it didn't`);
    }
    return;
  }

  const test = line => msg.test(line);
  if (_inspect.output.some(test)) {
    t.pass();
  } else {
    t.fail(`Expected console output (stdout) to match '${msg}' but it didn't`);
  }
};

const outputDoesNotContain = (t, msg) => {
  if (_inspect.output.join('\n').includes(msg)) {
    t.fail(`Expected console output (stdout) not to contain '${msg}' but it did`);
  } else {
    t.pass();
  }
};

const eOutputContains = (t, msg) => {
  if (_inspectE.output.join('\n').includes(msg)) {
    t.pass();
  } else {
    t.fail(`Expected console output (stderr) to contain '${msg}' but it didn't`);
  }
};

const eOutputDoesNotContain = (t, msg) => {
  if (_inspectE.output.join('\n').includes(msg)) {
    t.fail(`Expected console output (stderr) not to contain '${msg}' but it did`);
  } else {
    t.pass();
  }
};

const noWarn = t => eOutputDoesNotContain(t, 'warn');
const noError = t => eOutputDoesNotContain(t, 'error');

const requestBrunchServer = (path, callback) => {
  const http = require('http');
  const options = {
    host: 'localhost',
    port: 3333,
    path
  };

  http.request(options, response => {
    let responseText = '';
    response.on('data', chunk => {
      responseText += chunk;
    });
    response.on('end', () => callback(responseText));
  }).end();
};

const npmInstall = callback => {
  cp.exec('npm install', callback);
};

module.exports = {
  prepareTestDir,
  teardownTestDir,
  fileExists,
  fileDoesNotExist,
  fileContains,
  fileEquals,
  fileDoesNotContain,
  spyOnConsole,
  restoreConsole,
  outputContains,
  outputDoesNotContain,
  eOutputContains,
  eOutputDoesNotContain,
  noWarn,
  noError,
  requestBrunchServer,
  npmInstall
};
