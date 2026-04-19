'use strict';

const transpileModule = require('./transpile');
const ts = require('typescript');
const anymatch = require('anymatch');
const path = require('path');

const resolveEnum = (choice, opts) => {
  const defaultValue = 1; // CommonJS/ES5/Preserve JSX defaults

  if (!choice) return defaultValue;
  if (!isNaN(choice)) return choice - 0;

  for (const opt of Object.keys(opts)) {
    if (choice && choice.toUpperCase() === opt.toUpperCase()) {
      return opts[opt];
    }
  }

  return defaultValue;
};

const getTsconfig = configRoot => {
  if (!configRoot) return {};

  const file = path.resolve(configRoot, 'tsconfig.json');

  try {
    return require(file).compilerOptions;
  } catch (e) {
    return {};
  }
};

const findLessOrEqual = (haystack, needle) => {
  let i = 0;
  while (i + 1 < haystack.length && needle >= haystack[i + 1]) {
    i += 1;
  }
  return i === haystack.length ? -1 : i;
};

const errPos = err => {
  if (err.file) {
    const lineMap = err.file.lineMap;
    if (lineMap) {
      const lineIndex = findLessOrEqual(lineMap, err.start);

      return `Line: ${lineIndex + 1}, Col: ${err.start - err.file.lineMap[lineIndex] + 1}`;
    }
  }
  return 'No line map';
};

const toMeaningfulMessage = err => `Error ${err.code}: ${err.messageText} (${errPos(err)})`;

class TypeScriptCompiler {
  constructor(config) {
    if (!config) {
      config = {};
    }

    const options = config.plugins && config.plugins.brunchTypescript || {};
    this.options = getTsconfig(config.paths && config.paths.root);

    Object.keys(options).forEach(key => {
      if (key === 'sourceMap' || key === 'ignore') return;
      this.options[key] = options[key];
    });

    if (this.options.jsx === 'preserve') {
      this.targetExtension = '.jsx';
    } else {
      this.targetExtension = '.js';
    }

    this.options.module = resolveEnum(this.options.module, ts.ModuleKind);
    this.options.target = resolveEnum(this.options.target, ts.ScriptTarget);
    this.options.jsx = resolveEnum(this.options.jsx, ts.JsxEmit);
    this.options.emitDecoratorMetadata = this.options.emitDecoratorMetadata !== false;
    this.options.experimentalDecorators = this.options.experimentalDecorators !== false;
    this.options.noEmitOnError = false; // This can"t be true when compiling this way.

    delete this.options.moduleResolution;

    this.options.sourceMap = !!config.sourceMaps;
    this.isIgnored = anymatch(options.ignore || config.conventions.vendor);
    if (this.options.pattern) {
      this.pattern = this.options.pattern;
      delete this.options.pattern;
    }

    if (this.options.ignoreErrors) {
      if (this.options.ignoreErrors === true) {
        this.ignoreAllErrors = true;
      } else {
        this.ignoreErrors = new Set(this.options.ignoreErrors);
      }
      delete this.options.ignoreErrors;
    }
  }

  compile(params) {
    if (this.isIgnored(params.path)) return Promise.resolve(params);

    const tsOptions = {
      fileName: params.path,
      reportDiagnostics: true,
      compilerOptions: this.options,
    };

    return new Promise((resolve, reject) => {
      let compiled;

      try {
        compiled = transpileModule(params.data, tsOptions);
        let reportable = compiled.diagnostics;

        if (this.ignoreAllErrors === true) {
          reportable = [];
        } else if (this.ignoreErrors) {
          reportable = reportable.filter(err => !this.ignoreErrors.has(err.code));
        }

        if (reportable.length) {
          reject(reportable.map(toMeaningfulMessage).join('\n'));
        }
      } catch (err) {
        return reject(err);
      }

      const result = {data: `${compiled.outputText || compiled}\n`};

      if (compiled.sourceMapText) {
        // Fix the sources path so Brunch can merge them.
        const rawMap = JSON.parse(compiled.sourceMapText);
        rawMap.sources[0] = params.path;
        result.map = JSON.stringify(rawMap);
      }

      resolve(result);
    });
  }
}

TypeScriptCompiler.prototype.brunchPlugin = true;
TypeScriptCompiler.prototype.type = 'javascript';
TypeScriptCompiler.prototype.pattern = /\.tsx?$/;

module.exports = TypeScriptCompiler;
