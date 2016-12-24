'use strict';

const cp = require('child_process');
const path = require('path');
const fs = require('fs');

const yarnOrNpm = rootPath => {
  const yarn = cp.spawnSync('yarn' , ['--version']);
  if (!yarn.error) {
    const lockPath = path.join(rootPath, 'yarn.lock');
    if (fs.existsSync(lockPath)) return 'yarn';
  }

  return 'npm';
};

module.exports = (rootPath, pkgType) => {
  if (!pkgType) return Promise.resolve();

  let manager;

  switch (pkgType) {
    case 'package':
      manager = yarnOrNpm(rootPath);
      break;
    case 'bower':
      manager = 'bower';
      break;
    default:
      const error = new Error(`install-deps: ${pkgType} is not supported`);
      error.code = 'INSTALL_DEPS_FAILED';
      return Promise.reject(error);
  }

  logger.info(`Installing packages with ${manager}...`);

  const prod = process.env.NODE_ENV === 'production' ? '--production' : '';
  const cmd = `${manager} install ${prod}`;

  return new Promise((resolve, reject) => {
    const prevDir = process.cwd();
    process.chdir(rootPath);
    cp.exec(cmd, (error, stdout, stderr) => {
      process.chdir(prevDir);
      if (error) {
        const log = stderr.toString();
        logger.error(log);
        return reject(log);
      }
      resolve(stdout);
    });
  });
};
