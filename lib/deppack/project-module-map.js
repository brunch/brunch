'use strict';

// maps project files to module names, also shims
// this is needed to not throw on app-wise requires
// note that fileList.files can't be used because it's not fully populated until the first compilation
class ProjectModuleMap {
  constructor(nameCleaner) {
    this.modMap = {};
    this.nameCleaner = nameCleaner;
  }

  cleanMod(mod) {
    return this.nameCleaner(mod.split('.').slice(0, -1).join('.'));
  }

  add(mod) {
    const name = this.cleanMod(mod);
    this.modMap[name] = mod;
  }

  addMany(obj) {
    Object.assign(this.modMap, obj);
  }

  toHash() {
    return this.modMap;
  }
}

module.exports = ProjectModuleMap;
