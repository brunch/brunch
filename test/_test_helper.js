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

module.exports.prepareTestDir = function prepareTestDir() {
  fs.mkdirsSync(tmp);
  process.chdir(tmp);
  createPackageJson();
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

module.exports.fileContains = function fileContains(t, path, content) {
  try {
    t.true(fs.readFileSync(path, 'utf8').includes(content));
  } catch (e) {
    t.fail(e.message);
  }
};

module.exports.fileNotContains = function fileNotContains(t, path, content) {
  try {
    t.false(fs.readFileSync(path, 'utf8').includes(content));
  } catch (e) {
    t.fail(e.message);
  }
};

