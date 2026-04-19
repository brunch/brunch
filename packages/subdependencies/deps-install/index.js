'use strict';
const fs = require('fs');
const { resolve, join, basename, dirname, sep } = require('path');
const cp = require('child_process');
const { promisify } = require('util');
const exec = promisify(cp.exec);
const readdirp = require('readdirp');
const semver = require('semver');
const readFile = promisify(fs.readFile);

const fsAccess = promisify(fs.access);
async function exists(path) {
  try {
    await fsAccess(path);
    return true;
  } catch (error) {
    return false;
  }
}

const readJSON = async path => {
  const data = await readFile(path, 'utf-8');
  const json = JSON.parse(data);
  return json;
};

const AT = '@';

const readVersions = async (root, filterer, namespaces) => {
  const moduleRoot = join(root, 'node_modules');
  const entries = await readdirp.promise(moduleRoot, {
    fileFilter: 'package.json',
    directoryFilter(entry) {
      if (entry.path.startsWith(AT) && entry.basename.startsWith(AT)) {
        return namespaces.has(entry.basename);
      }
      return filterer.has(entry.path.replace(sep, '/'));
    },
    depth: 2
  });

  const output = {};
  for (const entry of entries) {
    const path = join(moduleRoot, entry.path);
    const data = await readJSON(path);
    output[data.name] = data.version;
  }
  return output;
};

async function checkDeps(root, includeDevDeps = false) {
  const pth = resolve(join(root, 'package.json'));
  const pkg = await readJSON(pth);
  const deps = pkg.dependencies || {};
  if (includeDevDeps) {
    const dev = pkg.devDependencies || {};
    Object.assign(deps, dev);
  }
  const filterer = new Set();
  const namespaces = new Set();
  Object.keys(deps).forEach(dep => {
    if (dep.startsWith(AT)) {
      namespaces.add(dirname(dep));
    }
    filterer.add(dep);
  });
  if (Object.keys(deps).length === 0) {
    return [];
  }
  const installed = await readVersions(root, filterer, namespaces);
  const needUpdate = Object.keys(deps).filter(name => {
    if (!installed.hasOwnProperty(name)) return true;
    const range = deps[name];
    const actualVer = installed[name];
    // TODO: Better check for URLs. Maybe use private npm properties.
    if (/\//.test(range)) return false;
    // Skip check for version = latest.
    if (range === 'latest') return false;
    // e.g. semver('1.0.0', '^1')
    if (semver.satisfies(actualVer, range)) return false;
    return true;
  });
  return needUpdate;
}

// Force colors in `exec` outputs
process.env.FORCE_COLOR = 'true';
process.env.NPM_CONFIG_COLOR = 'always';

const _cache = {};
function installed(cmd) {
  if (cmd in _cache) {
    return _cache[cmd];
  }
  // shell: true must be set for this test to work on non *nixes.
  // TODO: async version
  _cache[cmd] = !cp.spawnSync(cmd, ['--version'], { shell: true }).error;
  return _cache[cmd];
}

async function getInstallCmd(rootPath) {
  const pkgPath = join(rootPath, 'package.json');
  if (!(await exists(pkgPath))) return;

  if (installed('yarn')) {
    const lockPath = join(rootPath, 'yarn.lock');
    if (await exists(lockPath)) return 'yarn';
  }

  if (installed('pnpm')) {
    const lockPath = join(rootPath, 'shrinkwrap.yaml');
    const lockPath2 = join(rootPath, 'pnpm-lock.yaml');
    if (await exists(lockPath) || await exists(lockPath2)) return 'pnpm';
  }

  return 'npm';
}

async function installDeps(rootPath = '.', options = {}) {
  const logger = options.logger || console;
  const env = process.env.NODE_ENV === 'production' ? '--production' : '';

  const prevDir = process.cwd();
  if (rootPath !== '.') process.chdir(rootPath);

  try {
    const cmd = await getInstallCmd(rootPath);
    if (!cmd) return;
    logger.info(`Installing packages with ${cmd}...`);
    await exec(`${cmd} install ${env}`);
    return true;
  } catch (error) {
    error.code = 'INSTALL_DEPS_FAILED';
    logger.error(error);
    throw error;
  } finally {
    if (rootPath !== '.') process.chdir(prevDir);
  }
}

exports.checkDeps = checkDeps;
exports.installDeps = installDeps;
