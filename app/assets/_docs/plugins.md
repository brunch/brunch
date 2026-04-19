# Brunch: Plugin API

Brunch plugins are plain JS classes which are initialized with Brunch configs.

<div class="toc-placeholder"></div>

## Reference

Plugins work with so-called `File` entities:

```json
{
  "data": "var hello = 42;\n",
  "path": "app/file.js"
}
```

As you can see, `File`s are bald JS `Object`s, which may contain fields like:

* `path` - system path to the file
* `data` - file data as JS `String`
* `map` - source map
* and anything else that could be consumed by next plugins.

### Pipeline

The Brunch execution pipeline looks like this:

```
// [internal] Watch files with Chokidar.
// When any file is added or changed, start the pipeline.
watch(files)
|
// When any file is added or changed, start the pipeline.
// Check whether the file is correct.
lint(file): Boolean
|
// Transform file contents into js, css etc.
compile(file): File
|
// Extract file's dependants & dependencies
getDependencies(file): Array[Path]
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

### Method: `getDependencies(file): Array[Path]`

Given a file, this should return a list of file paths that depend on this one.

### Method: `lint(file): Promise(ok, Error)`

Check whether the file is correct.

### Method: `compile(file): File`

Compile a source file into JS or CSS.

CSS compilers can optionally produce the result with the `exports` key, which should be a string of JavaScript code (with `module.exports`), that will be added into the bundle if the project code `require`s a stylesheet.

### Method: `compileStatic(file): File`

Compile a static asset.

### Method: `optimize(file): File`

Transform the compiled js/css into optimized js/css.

### Hook: `preCompile`

Called only before first compilation.

### Hook: `onCompile`

Is called after every compilation pipeline is completed.

### Hook: `teardown`

Allows to stop web-servers & other long-running entities.
Executed before Brunch process is closed.

### Property: `type`

`String`.
Specifies the file type the plugin works on.
Can be either of `javascript`, `stylesheet`, or `template`.

### Property: `include`

`Array`.
Specifies additional files which will be included into build.

### Property: `extension`

`String`.
Specifies the file extension that will be processed by this plugin.

### Property: `pattern`

`RegExp`.
Allows more flexibility than `extension`, e.g. to process several extensions.
If this is specified, `extension` will be **ignored**.
Either `pattern` or `extension` needs to be specified for *compilers* and *linters*.
*Optimizers* don't need it.

### Property: `targetExtension`

`String`.
Convenience for making chains of compilers.
Specifies the new extension of processed file.
For example, `less-brunch` changes `.less` to `.css` so `postcss-brunch` matches file by extension.

### Property: `staticExtension`

`String`.
Optional.
Same as `extension` but allow to pick a different extension when processing static assets.
If this is not specified, it falls back to `extension`.

### Property: `staticPattern`

`String`.
Optional.
Same as `pattern` but allow to pick a different extension when processing static assets.
If this is not specified, it falls back to `pattern`.

### Property: `staticTargetExtension`

`String`.
Required for static compilers.
Specifies the new extension of the processed static asset.
In case `extension` was specified, this will just replace it.
If `pattern` was specified, everything pattern matches will be replaced with `staticTargetExtension`.

## Samples

### Boilerplate plugin

Let's take a look at the [boilerplate plugin](https://github.com/brunch/brunch-boilerplate-plugin). Feel free to use it to create your own plugins:

```js
'use strict';

// Documentation for Brunch plugins:
// https://github.com/brunch/brunch/blob/master/docs/plugins.md

// Remove everything your plugin doesn't need.
class BrunchPlugin {
  constructor(config) {
    // Replace 'plugin' with your plugin's name.
    // Don't include 'brunch' or 'plugin' words in configuration key.
    this.config = config.plugins.plugin || {};
  }

  // Optional
  // Specifies additional files which will be included into build.
  // get include() { return ['path-to-file-1', 'path-to-file-2']; }

  // file: File => Promise[Boolean]
  // Called before every compilation. Stops it when the error is returned.
  // Examples: ESLint, JSHint, CSSCheck.
  // lint(file) { return Promise.resolve(true); }

  // file: File => Promise[File]
  // Transforms a file data to different data. Could change the source map etc.
  // Examples: JSX, CoffeeScript, Handlebars, SASS.
  // compile(file) { return Promise.resolve(file); }

  // file: File => Promise[Array: Path]
  // Allows Brunch to calculate dependants of the file and recompile them too.
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
// BrunchPlugin.prototype.pattern = /\.jsx?$/;
// `pattern` is preferred over `extension` by Brunch.
// Please, specify only one of them.

// Indicates which environment a plugin should be applied to.
// The default value is '*' for usual plugins and
// 'production' for optimizers.
// BrunchPlugin.prototype.defaultEnv = 'production';

module.exports = BrunchPlugin;
```

### CSS compiler example

The plugin would simply read the file and return its contents.

```js
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

### Minifier example

An abstract minifier that consumes source maps.

```js
class UglifyOptimizer {
  constructor(config) {
    this.config = config.plugins.uglify;
    this.isPretty = this.config.pretty;
  }

  optimize(file) {
    try {
      const optimized = minifier(file.data, {
        fromString: true,
        inSourceMap: file.map,
        pretty: this.isPretty
      });
      return Promise.resolve(optimized);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

UglifyOptimizer.prototype.brunchPlugin = true;
UglifyOptimizer.prototype.type = 'javascript';
UglifyOptimizer.prototype.extension = 'js';

module.exports = UglifyOptimizer;
```

See the [plugins page](http://brunch.io/plugins) for a list of plugins. Feel free to add new plugins by editing [plugins.json](https://github.com/brunch/brunch.github.io/blob/master/plugins.json) and sending a Pull Request.

### Exporting JS from stylesheets

Starting Brunch 2.6, it is possible for non-JS compilers to output JavaScript modules **in addition** to whatever they do.

A use case could be a styles compiler with CSS modules support that allows you to do something like this:

```stylus
.button
  margin: 0
```

```js
const style = require('./button.styl');
// ...

// style.button will return the obfuscated class name (something like "_button_xkplk_42" perhaps)
<div className={style.button}>...</div>
```

All compiler needs to do is return `exports` in addition to `{data, map}`:

```js
class MyCompiler {
  compile({data, path}) {
    const compiled = magic(data);
    const mapping = mappingMagic(data);
    const exports = `module.exports = ${JSON.stringify(mapping)};`;

    return Promise.resolve({ data: compiled, exports });
  }
}
```

Note: exported JS will not be compiled or linted by any other plugin and its `require` statements will not be resolved. Make sure your exported JS is self-contained.

### Static file compilers

Sometimes, you would want to process different kinds of files, to which the Brunch's general compile-join-write logic does not apply.
Jade templates to HTML is one example.
You want to have a `.jade` file compiled into `.html`.
Previously, what you would do in this case was to hook into `onCompile` and look for jade files... and then compile them and write them manually. Sucks.

So starting Brunch `2.8.0`, there is a better way.

```js
class JadeCompiler {
  compileStatic({data, path}) {
    return new Promise((resolve, reject) => {
      toHtml(path, data, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
}
JadeCompiler.prototype.brunchPlugin = true;
JadeCompiler.prototype.type = 'template';
JadeCompiler.prototype.extension = 'jade';
// alternatively, a static extension can be different from `extension`:
// JadeCompiler.prototype.staticExtension = 'static.jade';
// this is used to tell Brunch which extension to use after static compilation
JadeCompiler.prototype.staticTargetExtension = 'html';
```

A plugin can handle both `compile` and `compileStatic`.

Unlike usual compilers, static compilers process files from the assets folder (`app/assets` by default) instead of just copying.
So, with the example plugin above, `app/assets/index.jade` will be transformed into `public/index.html`.

`getDependencies` will be called for *both* regular files and assets.

## Publishing

Making your plugin available to everyone is as simple as
[publishing a new NPM package](https://docs.npmjs.com/getting-started/publishing-npm-packages).

After that, add the plugin to [brunch.io/plugins](http://brunch.io/plugins).
This will make more people aware of it.

## Tips

Make Brunch plugins as simple as possible. Don't try to copy Grunt, Gulp or other task runners approaches.
