'use strict';
const Module = require('module');
const origLoad = Module._load;

const sysPath = require('universal-path');
const libPath = sysPath.resolve('lib');
const configPath = require.resolve(`${libPath}/config`);
const pluginsPath = require.resolve(`${libPath}/plugins`);

const cwd = process.cwd();
const os = require('os');
const fs = require('fs');
const cp = require('child_process');

const testDir = `${os.tmpdir()}/brunch-plugins-test`;
const npmDir = `${testDir}/node_modules`;

const mkdir = dir => {
  try {
    fs.mkdirSync(dir);
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};

before(() => {
  mkdir(testDir);
  process.chdir(testDir);
});

beforeEach(() => {
  mkdir(npmDir);
});

afterEach(() => {
  delete require.cache[configPath];
  delete require.cache[pluginsPath];

  Module._load = origLoad;
  cp.execSync(`rm -rf ${npmDir}`);
});

after(() => {
  process.chdir(cwd);
  cp.execSync(`rm -rf ${testDir}`);
});

const config = exports.config = partConfig => {
  if (!require.cache[configPath]) {
    require(configPath).init(partConfig);
  }
};

const patch = fn => {
  const old = Module._load;

  Module._load = function(...args) {
    return fn.apply(this, args) || old.apply(this, args);
  };
};

exports.plugins = plugins => {
  Object.keys(plugins).forEach(name => {
    mkdir(`${npmDir}/${name}`);
  });

  patch(name => {
    if (plugins.hasOwnProperty(name)) return plugins[name];
  });
};


exports.trap = plugins => {
  patch(name => {
    if (plugins.includes(name)) {
      throw new Error(`"${name}" should not have been required`);
    }
  });
};

exports.init = () => {
  config();

  return require(pluginsPath);
};
