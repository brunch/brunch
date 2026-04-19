'use strict';

const withoutExt = mod => mod.split('.').slice(0, -1).join('.');
const extRe = /\.(\w+)$/;
const ext = (mod) => {
  const match = extRe.exec(mod);
  return match && match[1];
};
const indexRe = /\/index$/;

// maps project files to module names, also shims
// this is needed to not throw on app-wise requires
// note that fileList.files can't be used because it's not fully populated until the first compilation
class ProjectModuleMap {
  constructor(nameCleaner) {
    this.modMap = {};
    this.nameCleaner = nameCleaner;
    this.exts = {};
  }

  cleanMod(mod) {
    return this.nameCleaner(mod);
  }

  add(mod) {
    // make modMap aware of both fully-qualified and extension-free names of the module
    const cleanName = this.cleanMod(mod);
    const cleanWoExt = this.cleanMod(withoutExt(mod));
    const indexName = indexRe.test(cleanWoExt) && cleanWoExt.replace(indexRe, '');
    if (ext(mod)) {
      this.exts[ext(mod)] = true;
    }
    [cleanName, cleanWoExt, indexName].filter(x => x).forEach(name => this.modMap[name] = mod);
  }

  addMany(obj) {
    Object.assign(this.modMap, obj);
  }

  extensions() {
    return Object.keys(this.exts);
  }

  toHash() {
    return this.modMap;
  }
}

module.exports = ProjectModuleMap;
