# Plugins

Brunch uses node.js plugins to provide linting / compilation / optimization functionality.

## Usage

Plugins can be installed with a simple console command:

`npm install --save sass-brunch` - would add `"sass-brunch": "~1.9.2"` to package.json of your brunch app.

Sometimes you'll want to use plugins which have not yet been published to NPM and are available only through GIT. In this case you can specify GIT URL for the command: `npm install --save git@github.com:brunch/sass-brunch.git`.

## API

Brunch plugins are plain JS classes which are initialized with brunch configs.

Almost every plugin is usually working with so-called `File` entities:

```
{"data": "var hello = 42;\n", "path": "app/file.js"}
```

As you can see, `File`s are bald JS `Object`s, which may contain fields like:

- `path` - system path to the file
- `data` - file data as JS `String`
- `map` - source map
- and everything else that could be consumed by next plugins.
  For example, the linter plugin may add `babelTree` to the `File`,
  the compiler plugin in pipeline would see it and won't do the parsing twice.

The Brunch execution pipeline looks like this:

```
// [internal] Watch files with Chokidar.
watch(files)
|
// When any file is added or changed, start the pipeline.
// Check whether the file is correct.
lint(file): Boolean
|
// Extract file's dependants & dependencies
getDependencies(file): Array
|
// Transform file contents into js, css etc.
compile(file): File
|
// [internal] wrap file into a module definition
wrap(file): File
|
// [internal] concat many files into one
concat(files): File
|
// Transform the output JS / CSS into different JS / CSS.
optimize(file): File
|
// The compilation is finished.
onCompile(files, assets)
```

Let's take a look at the [boilerplate plugin](https://github.com/brunch/brunch-boilerplate-plugin). Feel free to use it to create your own plugins:

```javascript
'use strict';

// Documentation for Brunch plugins:
// https://github.com/brunch/brunch/blob/master/docs/plugins.md

// Remove everything your plugin doesn't need.
class BrunchPlugin {
  constructor(config) {
    // Replace 'plugin' with your plugin's name;
    this.config = config && config.plugins && config.plugins.plugin;
  }

  // file: File => Promise[Boolean]
  // Called before every compilation. Stops it when the error is returned.
  // Examples: ESLint, JSHint, CSSCheck.
  // lint(file) { return Promise.resolve(true); }

  // file: File => Promise[File]
  // Transforms a file data to different data. Could change the source map etc.
  // Examples: JSX, CoffeeScript, Handlebars, SASS.
  // compile(file) { return Promise.resolve(file); }

  // file: File => Promise[Array: Path]
  // Allows Brunch to calculate dependants of the file and re-compile them too.
  // Examples: SASS '@import's, Jade 'include'-s.
  // getDependencies(file) { return Promise.resolve(['dep.js']); }

  // file: File => Promise[File]
  // Usually called to minify or optimize the end-result.
  // Examples: UglifyJS, CSSMin.
  // optimize(file) { return Promise.resolve({data: minify(file.data)}); }

  // files: [File] => null
  // Executed when each compilation is finished.
  // Examples: Hot-reload (send a websocket push).
  // onCompile(files) {}

  // Allows to stop web-servers & other long-running entities.
  // Executed before Brunch process is closed.
  // teardown() {}
}

// Required for all Brunch plugins.
BrunchPlugin.prototype.brunchPlugin = true;

// Required for compilers, linters & optimizers.
// 'javascript', 'stylesheet' or 'template'
// BrunchPlugin.prototype.type = 'javascript';

// Required for compilers & linters.
// It would filter-out the list of files to operate on.
// BrunchPlugin.prototype.extension = 'js';
// BrunchPlugin.prototype.pattern = /\.js$/;

// Indicates which environment a plugin should be applied to.
// The default value is '*' for usual plugins and
// 'production' for optimizers.
// BrunchPlugin.prototype.defaultEnv = 'production';

module.exports = BrunchPlugin;
```

### CSS compiler
The plugin would simply read the file and return its contents.

```javascript
class CSSCompiler {
  compile(file) {
    return Promise.resolve(file);
  }
}

CSSCompiler.prototype.brunchPlugin = true;
CSSCompiler.prototype.type = 'stylesheet';
CSSCompiler.prototype.extension = 'css';

module.exports = CSSCompiler;
```

### Minifier

An abstract minifier that consumes source maps.

```javascript
class UglifyOptimizer {
  constructor(config) {
    this.config = config && config.plugins && config.plugins.uglify;
    this.isPretty = this.config.pretty;
  }

  optimize(file) {
    let error;
    let optimized;

    try {
      optimized = minifier(file.data, {
        fromString: true,
        inSourceMap: file.map,
        pretty: this.isPretty
      });
      return Promise.resolve(optimized);
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

UglifyOptimizer.prototype.brunchPlugin = true;
UglifyOptimizer.prototype.type = 'javascript';
UglifyOptimizer.prototype.extension = 'js';

module.exports = UglifyOptimizer;
```

See the [plugins page](http://brunch.io/plugins.html) for a list of plugins. Feel free to add new plugins by editing [plugins.json](https://github.com/brunch/brunch.github.io/blob/master/plugins.json) and sending a Pull Request.

### JS exports

Starting Brunch (2.x.x `<unreleased>`), it is possible for non-JS compilers to output JavaScript modules **in addition** to whatever they do.

A use case could be a styles compiler with CSS modules support that allows you to do something like this:

```stylus
.button
  margin: 0
```

```javascript
var style = require('./button.styl');
// ...

// style.button will return the obfuscated class name (something like "_button_xkplk_42" perhaps)
<div className={style.button}>...</div>
```

All compiler needs to do is return `exports` in addition to `{data, map}`:

```javascript
class MyCompiler {
  compile(params) {
    const path = params.path;
    const data = params.data;

    const compiled = magic(data);
    const mapping = mappingMagic(data);
    const exports = 'module.exports = ' + JSON.stringify(mapping) + ';'

    return Promise.resolve({ data: compiled, exports });
  }
}
```

Note: exported JS will not be compiled or linter by any other plugin and its `require` statements will not be resolved. Make sure your exported JS is self-contained.
