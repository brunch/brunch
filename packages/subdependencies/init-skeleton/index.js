'use strict';
const fs = require('fs');
const sysPath = require('path');
const os = require('os');
const crypto = require('crypto');
const {promisify} = require('util');
const {installDeps} = require('micro-check-dependencies');

const cp = require('child_process');
const _ncp = require('ncp');
const exec = promisify(cp.exec);
const ncp = promisify(_ncp);

const logger = require('loggy');
const allSkeletons = require('brunch-skeletons').skeletons;
const hostedGitInfo = require('hosted-git-info');
const normalizeGitUrl = require('normalize-git-url');

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
    git = hosted.git();
  } else {
    logger.warn(`Couldn't interpret "${git}" as a hosted git url`);
  }

  return normalizeGitUrl(git).url;
}

function printErrorBanner(commandName = 'init-skeleton') {
  const suggestedCount = 8;
  const othersCount = skeletons.all.length - suggestedCount;

  const suggestions = skeletons.withAliases
    .slice(0, suggestedCount)
    .map(skeleton => {
      return `* ${commandName} ${skeleton.alias} - ${skeleton.description}`;
    })
    .join('\n');

  const error = new Error(
`You should specify skeleton (boilerplate) from which new app will be initialized.

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

  if (await exists(repoDir)) {
    logger.log(`Pulling recent changes from git repo "${url}" to "${repoDir}"...`);

    try {
      await exec('git pull origin master', {cwd: repoDir});
      logger.log(`Pulled master into "${repoDir}"`);
      return repoDir;
    } catch (error) {
      // Only true if `yarn` is used
      logger.log(`Could not pull, using cached version (${error})`);
    };
  }

  logger.log(`Cloning git repo "${url}" to "${repoDir}"...`);
  try {
    await exec(`git clone ${url} "${repoDir}"`);
    logger.log(`Cloned "${url}" into "${repoDir}"`);
    return repoDir;
  } catch (error) {
    throw new Error(`Git clone error: ${error}`);
  }
}

/**
 * @param {string} alias filesystem path or skeleton url
 * @param {object} options
 * @returns {Promise<boolean>}
 */
const initSkeleton = async (alias, options = {}) => {
  const cwd = process.cwd();
  const rootPath = sysPath.resolve(options.rootPath || cwd);
  const logger = options.logger || console;

  if (alias == null || alias === '.' && rootPath === cwd) {
    return printErrorBanner(options.commandName);
  }

  const pkgPath = sysPath.join(rootPath, 'package.json');
  if (await exists(pkgPath)) {
    const error = new Error(`Directory "${rootPath}" is already an npm project`);
    error.code = 'ALREADY_NPM_PROJECT';
    return Promise.reject(error);
  }

  // Copy skeleton from file system. Returns Promise.
  const skeleton = skeletons.urlFor(alias) || alias;
  const skeletonExists = await exists(skeleton);
  const rPath = skeletonExists ? skeleton : await clone(skeleton);
  await fs.promises.mkdir(rPath, {recursive: true, mode: rwxrxrx});

  logger.log(`Copying local skeleton to "${rPath}"...`);
  await ncp(rPath, rootPath, {
    filter: path => !/^\.(git|hg)$/.test(sysPath.basename(path))
  });

  logger.log('Created skeleton directory layout');
  await installDeps(rootPath, {logger});
  return true;
};

exports.initSkeleton = initSkeleton;
exports.cleanURL = cleanURL;
exports.printErrorBanner = commandName => {
  try {
    return printErrorBanner(commandName);
  } catch (error) {
    console.log(error.message);
  }
};
