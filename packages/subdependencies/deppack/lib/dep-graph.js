'use strict';

// not really a graph
class DepGraph {
  constructor() {
    this.fileModMap = {};
    this.fileFileMap = {};
  }

  addFileMods(file, mods) {
    this.fileModMap[file] = mods;
  }

  addFileFiles(file, files) {
    this.fileFileMap[file] = files;
  }

  getFileFiles(file) {
    return this.fileFileMap[file] || [];
  }

  getFilesToCheckUnlink(file, files) {
    return this.getFileFiles(file).filter(x => files.indexOf(x) === -1);
  }

  getFilesToUnlink(file, files) {
    return files.filter(f => {
      const refs = this.referrals(f);
      return refs.length === 1 && refs[0] === file || refs.length === 0;
    });
  }

  referrals(file) {
    return Object.keys(this.fileFileMap).filter(r => this.getFileFiles(r).indexOf(file) !== -1);
  }

  recursiveDependents(file, cache) {
    if (!cache) cache = {};
    const deps = this.getFileFiles(file);

    if (deps.length === 0) return [];

    const allDepFiles = this.getFileFiles(file).filter(f => !(f in cache));
    allDepFiles.forEach(f => cache[f] = true);
    const allDeps = allDepFiles.map(dep => this.recursiveDependents(dep, cache)).reduce((memo, entry) => memo.concat(entry), deps);
    return Array.from(new Set(allDeps).values());
  }

  removeFileMods(file) {
    delete this.fileModMap[file];
  }

  removeFileFiles(file) {
    delete this.fileFileMap[file];
  }

  fileModsNotChanged(file, mods) {
    const curr = this.fileModMap[file];
    if (!curr || curr.length !== mods.length) return false;

    return curr.join(',') === mods.join(',');
  }

  unlink(file) {
    const files = this.getFileFiles(file);

    this.removeFileMods(file);
    this.removeFileFiles(file);

    return this.getFilesToUnlink(file, files);
  }

  serialize(modMap, fileReflection) {
    const generateFileBasedModuleName = require('./module-naming').generateFileBasedModuleName;
    const pathToName = path => {
      if (path === '___globals___') return path;
      if (fileReflection.isApp(path)) {
        return modMap.cleanMod(path);
      } else {
        return generateFileBasedModuleName(path);
      }
    };
    return Object.keys(this.fileModMap).reduce((serialized, file) => {
      const mods = this.fileFileMap[file].map(pathToName);
      const key = pathToName(file);
      serialized[key] = mods;
      return serialized;
    }, {});
  }
}

module.exports = DepGraph;
