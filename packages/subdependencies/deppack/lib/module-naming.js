'use strict';

const sep = '/';
const slashes = string => string.replace(/\\/g, '/');

const getModuleRootPath = path => {
  const split = path.split(sep);
  const index = split.lastIndexOf('node_modules');
  const scoped = split[index + 1][0] === '@';
  return split.slice(0, index + 2 + (scoped ? 1 : 0)).join(sep);
};

const getModuleRootName = path => {
  const split = path.split(sep);
  const index = split.lastIndexOf('node_modules');
  const scoped = split[index + 1][0] === '@';
  return split.slice(index + 1, index + 2 + (scoped ? 1 : 0)).join('/');
};

const getModuleTopRootName = mod => {
  const split = mod.split('/');
  const first = split[0];
  if (first[0] === '@') {
    return split.slice(0, 2).join('/');
  } else {
    return first;
  }
};

const getModuleFullRootName = path => {
  const split = path.split(sep);
  const indexS = split.indexOf('node_modules');
  const indexE = split.lastIndexOf('node_modules');
  const scoped = split[indexE + 1][0] === '@';
  const name = scoped ?
    split.slice(indexE + 1, indexE + 3) :
    split.slice(indexS + 1, indexE + 2);
  return name.join('/');
};

const generateModuleName = filePath => generateFileBasedModuleName(filePath).replace(/\/([^/]+)\.(json|js)$/, '/$1');

const generateFileBasedModuleName = filePath => {
  const rootName = getModuleFullRootName(filePath);
  const rootPath = getModuleRootPath(filePath);
  const path = filePath.replace(rootPath, '');
  return slashes(rootName + path);
};

module.exports = {getModuleRootPath, getModuleRootName, getModuleTopRootName, getModuleFullRootName, generateModuleName, generateFileBasedModuleName};
