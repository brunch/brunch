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
}

module.exports = DepGraph;
