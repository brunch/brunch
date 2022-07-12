'use strict';
const fs = require('fs');
const sysPath = require('path');
const os = require('os');
const crypto = require('crypto');
const {promisify} = require('util');
const {installDeps} = require('deps-install');

const cp = require('child_process');
const _ncp = require('ncp');
const exec = promisify(cp.exec);
const ncp = promisify(_ncp);

const logger = require('loggy');
const allSkeletons = require('brunch-skeletons').skeletons;
const hostedGitInfo = require('hosted-git-info');
const normalizeGitUrl = require('normalize-git-url');

const isWindows = os.platform() === 'win32';
const homeDir = os.homedir();
const cacheDir = sysPath.join(homeDir, '.brunch', 'skeletons');
const rwxrxrx = 0o755;

const skeletons = {};
const withAliases = allSkeletons.filter(skeleton => 'alias' in skeleton);
skeletons.all = allSkeletons;
skeletons.withAliases = withAliases;
skeletons.urlFor = alias => {
  for (const skeleton of withAliases) {
    if (skeleton.alias === alias) return skeleton.url;
  }
};

// abbrev of sha
function sha256(string) {
  return crypto.createHash('sha256').update(string).digest('hex').slice(0, 8);
}

async function exists(path) {
  try {
    await promisify(fs.access)(path);
    return true;
  } catch (error) {
    return false;
  }
}

function cleanURL(address) {
  let git = address.replace(/^gh:/, 'github:');
  const hosted = hostedGitInfo.fromUrl(git);
  if (hosted) {
    git = hosted.https();
  } else {
    logger.warn(`Couldn't interpret "${git}" as a hosted git url`);
  }

  return normalizeGitUrl(git).url;
}

function printErrorBanner() {
  const commandName = 'brunch new -s';
  const suggestedCount = 8;
  const othersCount = skeletons.all.length - suggestedCount;

  const suggestions = skeletons.withAliases
    .slice(0, suggestedCount)
    .map(skeleton => {
      return `* ${commandName} ${skeleton.alias} - ${skeleton.description}`;
    })
    .join('\n');

  const error = new Error(`You should specify skeleton (boilerplate) from which new app will be initialized.

Pass skeleton name or URL like that:

${commandName} simple
${commandName} https://github.com/brunch/dead-simple

A few popular skeletons:

${suggestions}

Other ${othersCount} boilerplates are available at
http://brunch.io/skeletons`
  );

  error.code = 'SKELETON_MISSING';

  return Promise.reject(error);
}

/**
 * @returns Promise<string>
 */
async function clone(skeleton) {
  await fs.promises.mkdir(cacheDir, {recursive: true});
  const url = cleanURL(skeleton);
  const repoDir = sysPath.join(cacheDir, sha256(url));
  const formatted = isWindows ? repoDir :
    repoDir.replace(homeDir, '~');

  if (await exists(repoDir)) {
    logger.info(`Pulling recent changes from git repo "${url}" to "${formatted}"...`);

    try {
      await exec('git pull origin master', {cwd: repoDir});
      logger.info(`Pulled master into "${formatted}"`);
      return repoDir;
    } catch (error) {
      // Only true if `yarn` is used
      logger.info(`Could not pull, using cached version (${error})`);
    };
  }

  logger.info(`Cloning git repo "${url}" to "${formatted}"...`);
  try {
    await exec(`git clone ${url} "${repoDir}"`);
    logger.info(`Cloned "${url}"`);
    return repoDir;
  } catch (error) {
    throw new Error(`Git clone error: ${error}`);
  }
}

/**
 * @param {string} alias filesystem path or skeleton url
 * @param {string} rootPath
 * @returns {Promise<boolean>}
 */
async function initSkeleton(alias, rootPath) {
  if (!alias) {
    alias = process.env.BRUNCH_INIT_SKELETON || 'https://github.com/brunch/dead-simple';
  }
  const cwd = process.cwd();
  rootPath = sysPath.resolve(rootPath || cwd);

  if (alias == null || alias === '.' && rootPath === cwd) {
    return printErrorBanner();
  }

  if (await exists(sysPath.join(rootPath, 'package.json'))) {
    const error = new Error(`Directory "${rootPath}" is already an npm project`);
    error.code = 'ALREADY_NPM_PROJECT';
    throw error;
  }

  // Copy skeleton from file system. Returns Promise.
  const skeleton = skeletons.urlFor(alias) || alias;
  const skeletonExists = await exists(skeleton);
  const rPath = skeletonExists ? skeleton : await clone(skeleton);
  await fs.promises.mkdir(rootPath, {recursive: true, mode: rwxrxrx});

  const relative = sysPath.relative(cwd, rootPath);
  logger.info(`Copying local skeleton to "${relative}"...`);
  const timer = Date.now();
  await ncp(rPath, rootPath, {
    filter: path => !/^\.(git|hg)$/.test(sysPath.basename(path))
  });

  const difference = Date.now() - timer;
  if (difference > 30) {
    logger.info('Created skeleton directory layout');
  }
  await installDeps(rootPath, {logger});
  return true;
};

exports.initSkeleton = initSkeleton;
exports.cleanURL = cleanURL;
exports.printErrorBanner = () => {
  try {
    return printErrorBanner();
  } catch (error) {
    console.log(error.message);
  }
};
