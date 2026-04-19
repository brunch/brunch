# Brunch: Config

Brunch uses configuration file `brunch-config.js` _(or `.coffee`)_ to manage various aspects of your app.

* [**`paths`**](#paths) — where to take files from and where to put generated ones
* [**`files`**](#files) — which files exactly should Brunch generate and how.
* [**`npm`**](#npm) — NPM dependencies settings
* [**`plugins`**](#plugins) — individual plugin settings.

Less common options:

* [`modules`](#modules) — specifies details of JS module implementation, such as `wrapper`, `definition`, `autoRequire` and `nameCleaner`.
* [`conventions`](#conventions) — defines which files are treated as assets and which ones are ignored in your app.
* [`watcher`](#watcher) — low-level configuration of the file watcher which empowers Brunch.
* [`server`](#server) — allows to describe custom web-servers instead of the built-in one.
* [`notifications`](#notifications) — configures the levels of notifications, their title, icon, etc.
* [`sourceMaps`](#sourcemaps), [`optimize`](#optimize) — simple true/false options
* [`hooks`](#hooks) — allows to specify handlers for different moments of building cycle

<span class="note">
  You can see the config schema, and all the defaults, in the `configBaseSchema` of [`lib/utils/config-validate.js`](https://github.com/brunch/brunch/blob/master/lib/utils/config-validate.js#L9) in the Brunch source code.
</span>

## Example

Simplest Brunch config looks like that. Just 6 lines of pure configuration:

```js
module.exports = {
  files: {
    javascripts: {joinTo: 'app.js'},
    stylesheets: {joinTo: 'app.css'},
  }
}
```

Each Brunch config is an executable script,
so you can also execute arbitrary JS and import Node.js modules there.

## Pattern matching

Internally, Brunch uses [anymatch](https://github.com/es128/anymatch) for pattern matching — it's a module to match strings against configurable strings, globs, regular expressions or functions. If you want to define specific file pattern, you can use:

* **String** — path to your source files to be directly matched. You can use [globs](https://en.wikipedia.org/wiki/Glob_(programming)), so these strings may contain [wildcard characters](https://en.wikipedia.org/wiki/Wildcard_character) (`*`, `?`, etc). Example:

  ```js
  joinTo: {
    'app.css': 'path/to/*.css' // matches all CSS files
  }
  ```
* **Regular expression** — feel free to define a pattern using regular expression if you used to. Example:

  ```js
  joinTo: {
    'app.js': /\.js$/ // matches all JavaScript files
  }
  ```
* **Function** — if you need especially specific pattern, you can define it using function that takes the string as an argument and returns a truthy or falsy value (like `Array.filter` function do). Example:

  ```js
  joinTo: {
    // matches all JavaScript files with filenames longer that 3 characters
    'app.js': path => path.endsWith('.js') && path.length > 3
  }
  ```
* **Array** — an array of any number and mix of the above types. Example:

  ```js
  joinTo: {
    'app.js': [
      'path/to/specific/file.js',   // include specific file
      'any/**/*.js',                // all files with .js extension
      /\.test\.js$/,                // all files with .test.js extension
      path => path.includes('tmp')  // contains `tmp` substring
    ]
  }
  ```

## `paths`

`Object`: `paths` contains application paths to key directories. Paths are simple strings.

* `public` key: path to build directory that would contain output.
* `watched` key: list of all watched paths by brunch. Default:
  `['app', 'test', 'vendor']`

Example:

```js
paths: {
  public: '/user/www/deploy'
}
```

If you need to change the default directory for application's code, don't forget to add this directory to the `watched` field, like so:

```javascript
paths: {
  watched: ['src']
}
```

Also, consider [`module.nameCleaner` option](#-modules-), if you need to require your modules without prefixing with folder name.

## `files`

(`javascripts, stylesheets, templates`; `joinTo`s and `order`)

`Required, object`: `files` configures handling of application files: which compiler would be used on which file, what name should output file have etc. Any paths specified here must be listed in `paths.watched` as described above, for building.

* `<type>`: `javascripts`, `stylesheets` or `templates`
  - joinTo: (required when no `entryPoints` was declared) describes how files will be compiled & joined together.
    Available formats:
    + `'outputFilePath'` in order to have all source files compiled together to one
    + map of `'outputFilePath'` (see [Pattern matching](#pattern-matching) section)
  - entryPoints: (optional) describes the entry points of an application. The specified file and all of its dependencies will then be joined into a single file (or if you have specified a mapping, into several files). Resembles `joinTo` but allows to included only required files. Because `entryPoints` is so similar to `joinTo`, it is better to choose only one of them in most cases. See the example below.
    Available formats:
    + `'entryFile.js': 'outputFilePath'`
    + `'entryFile.js':` map of `'outputFilePath'` (see [Pattern matching](#pattern-matching) section)
  - order: (optional) defines compilation order. `vendor` files will be compiled before other ones even if they are not present here.
    + before: [matching pattern](#pattern-matching) defining files that will be loaded before other files
    + after: [matching pattern](#pattern-matching) defining files that will be loaded after other files
  - pluginHelpers: (optional) specify which output file (or array of files) plugins' include files concatenate into. Defaults to the output file that `vendor` files are being joined to, the first one with `vendor` in its name/path, or just the first output file listed in your joinTo object.

All files from `vendor` directory are by default concatenated before all files from `app` directory. So, `vendor/scripts/jquery.js` would be loaded before `app/script.js` even if order config is empty. Files from Bower packages are included by default before the `vendor` files.

Overall ordering is [before] -> [bower] -> [vendor] -> [everything else] -> [after]

Common example:

```js
files: {
  javascripts: {
    joinTo: {
      'javascripts/app.js': /^app/,
      'javascripts/vendor.js': /^(?!app)/
    }
   // or
   // entryPoints: {
   //   'entryPoints.js': {
   //     'javascripts/app.js': /^app/,
   //     'javascripts/vendor.js': /^(?!app)/
   //   }
   // }

  },
  stylesheets: {
    joinTo: 'stylesheets/app.css'
  },
  templates: {
    joinTo: 'javascripts/app.js'
  }
}
```

### A note on entry points

It is important to keep a few things in mind regarding entry points & their known limitations:

* only the things you `require` will be included into an entryPoint bundle. This means non-app/non-npm dependencie won't be included. Also means only statically analyzable `require`s will work:
  - `require('something')` — :+1:
  - `['a', 'b', 'c'].forEach(dep => require(dep))` — :-1:
  - `match('/', 'app/Home')` (where `app/Home` gets translated into `require('components/app/Home')`) — :-1:
* two entry points can't write to the same file

  ```js
  javascripts: {
    entryPoints: {
      'app/initialize.js': 'javascripts/bundle.js',
      // INVALID
      'app/bookmarklet.js': 'javascripts/bundle.js'
    }
  }
  ```
* all `config.npm.globals` will be included in **every** entry point and joinTo
* `entryPoints` only work with javascript files. If you want to also include your templates, keep a `joinTo` for them

## `npm`

`Object`: configures NPM integration for front-end packages. Make sure you also declare the packages you depend on in your `package.json` dependencies section.

* `npm.enabled`: `Boolean`: a toggle of whether the integration is enabled, defaults to `true`.
* `npm.globals`: `Object`: a mapping from global name (as a key) to the corresponding module name (string) to expose.
* `npm.styles`: `Object`: a mapping from package name (string) to an array of stylesheet paths (relative to package root) to be included into the build.
* `npm.static`: `Array`: a list of javascript files from npm packages to be included as-is, without analyzing their dependencies or wrapping them into modules.
* `npm.aliases`: `Object`: a mapping of files from an alias to a real package name. For example, if you are using `exoskeleton` fork of Backbone, setting this to `{"backbone": "exoskeleton"}` would load Exoskeleton when requiring backbone.

Example:

```js
npm: {
  styles: {pikaday: ['css/pikaday.css']},
  globals: {Pikaday: 'pikaday'}
}
```

## `plugins`

`Object`: Optional control to modify how plugins are loaded by default, as well as containing plugin-specific configuration.

* `off`: Plugins that may be installed, but should not be run.
* `on`: Forces listed plugins to be run, such as an optimizer even when the `optimize` flag is off.
* `only`: Explicitly list the plugins to be used, ignoring any others that are installed.
* `npm`: An array list of plugin names that will compile `node_modules/`. Defaults to `[]`. *(Note: for the time being, it works only with `.js` files)*
* _Per-Plugin_: Refer to each plugin's documentation for usage information.

Example:

```js
plugins: {
  on: ['postcss-brunch'],
  off: ['jade-brunch', 'handlebars-brunch'],
  npm: ['babel-brunch'],
  autoReload: {enabled: true}
}
```

## `conventions`

`Object`: `conventions` define tests, against which all file pathnames will be checked.

* `ignored` key: [matching pattern](#pattern-matching). Will check against files that should be ignored by brunch compiler, but are still watched by the watcher. For example, when you have `common.styl` file that you import in every stylus file, `common.styl` will be compiled on its own too which will result in duplicated code. When prefixing it with underscore (`_common.styl`) you are still able to import it in dependent files, but it won’t be compiled twice. The feature is very similar to [Sass partials](http://wiseheartdesign.com/articles/2010/01/22/structuring-a-sass-project/). By default, files and directories that start with underscore (`_`) will be ignored.
* `assets` key: [matching pattern](#pattern-matching). If test gives true, file won't be compiled and will be just moved to public directory instead.
* `vendor` key: [matching pattern](#pattern-matching). If test gives true, file won't be wrapped in module, if there are any.

Keep in mind that default brunch regexps, as you see, consider **all** `vendor/` (etc.) directories as vendor (etc.) files. So, `app/views/vendor/thing/file.js` will be treated as vendor file.

Example:

```javascript
conventions: {
  ignored: () => false, // override defaults for no ignored files
  assets: /files\//     // vendor/jquery/files/jq.img
}
```

You may find default values for `ignored`, `assets` and `vendor` fields in [Brunch sources](https://github.com/brunch/brunch/blob/master/lib/utils/config-validate.js).

## `modules`

`Object`: consists of `wrapper` and `definition` subsettings.

`modules.wrapper`: `String, Boolean or Function`: a wrapper that will be wrapped around compiled-to-javascript code in non-vendor directories. Values:

* `commonjs` (Default) — CommonJS wrapper.
* `amd` — AMD `r.js`-like wrapper.
* `false` — no wrapping. Files will be compiled as-is.
* Function that takes path, data, and a boolean set to `true` if the file is in a vendor directory.

`modules.definition`: `String, Boolean or Function` a code that will be added on top of every generated JavaScript file. Values:

* `commonjs` (Default) — CommonJS require definition.
* `amd`, `false` — no definition.
* Function that takes path and data

Example:

```js
// Same as 'commonjs'.
modules: {
  wrapper: (path, data) => {
    return `
require.define({${path}: function(exports, require, module) {
  ${data}
}});\n\n
    `
  }
}
```
`modules.autoRequire`: `Object` specifies requires to be automatically added at the end of joined file. The example below will require both 'app' and 'foo':

```js
// Default behaviour.
modules: {
  autoRequire: {
    'javascripts/app.js': ['app', 'foo']
  }
}
```

`modules.nameCleaner`: `Function` Allows you to set filterer function for module names,
for example, change all 'app/file' to 'file'. Example:

```js
// Default behaviour.
modules: {
  nameCleaner: path => path.replace(/^app\//, '')
}
```

```js
// Add namespacing to a project.
const {name} = require('./package.json');
modules: {
  nameCleaner: path => path.replace(/^app/, name)
}
```

Also `nameCleaner` option may help you when you need to change the default directory for app code to `src`, for example:

```js
modules: {
  nameCleaner: path => path.replace(/^src\//, '')
}
```

## `notifications`

Notifications are on by default.

* **`false`**: deactivate notifications.

* **Array**:

    * `notifications.levels` (`Array`): By default, only errors trigger notifications. If you want to display success, warning, or informational messages, set this to an array of strings with the levels you want to see, e.g. `['error', 'warn', 'info']`.
    * `notifications.app` (`String`): Sets the title used in notifications. Default value is Brunch.
    * `notifications.icon` (`String`): Sets the icon of the notification popup.

See [documentation for the Loggy package](https://github.com/paulmillr/loggy) for complete details.

## `optimize`

`Boolean`: determines if minifiers should be enabled or not. Default value is `false` (`true` if you run `brunch build --production`).

## `server`

**TL;DR:** To launch a custom Brunch webserver, you'll need to create a file `brunch-server.js` with a code similar to this:

```javascript

const express = require('express');
const app = express();

app.use(express.static(__dirname + '/public'));

// AJAX to /action.
app.post('/action', (req, res, next) => {
  res.send('POST action completed!');
});

// Export the module like this for Brunch.
module.exports = (config, callback) => {
  // Server config is passed within the `config` variable.
  app.listen(config.port, function () {
    console.log(`Example app listening on port ${config.port}!`);
    callback();
  });

  // Return the app; it has the `close()` method, which would be ran when
  // Brunch server is terminated
  return app;
};
```

`brunch watch --server` would *automatically* load the file.


`Object`: contains params of webserver that runs on `brunch watch --server`.

If a `brunch-server.js` or `brunch-server.coffee` file exists at the root of your project, Brunch will treat this as your custom web server. This can be overridden with the `server.path` option.

The server script must export a function that starts your custom server, either as the default exported module. This function should return an instance of [`http.Server`](https://nodejs.org/api/http.html#http_class_http_server) or an object containing a `close` property assigned to a function that shuts down the server. Examples:

```js
// javascript example using default export and node http core module
module.exports = (port, path, callback) => {
  // your custom server code
  // callback doesn't take any parameters and (if provided) should be called after server is started
  // up to you to respect the `port` argument allowing users to change it from the CLI
  const myServer = http.createServer();
  myServer.listen(port, callback);
  myServer.on('request', (req, res) => { /* do stuff */ });
  return myServer;
};
```

```js
// Example using custom `close` method.
module.exports = (port, path, callback) => {
  // custom server code
  return {
    close() { /* code for shutting down server */ }
  };
}
```

* `path`: (optional) custom path to Node.js file that will be loaded to run your custom server.

If a custom server is not present, Brunch will use [pushserve](https://github.com/paulmillr/pushserve). If using your own, only `port` from the following options can be set from the config.

* `port`: port on which server will run. Default: `3333`
* `hostname`: hostname on which server will run. Default `localhost`, which only permits connections from the same computer. Set to `0.0.0.0` to permit access from other computers.
* `base`: base URL from which to serve the app. Default: `''`
* `indexPath`: path to serve when base URL is requested. Default `index.html`
* `noPushState`: respond with 404 instead of `indexPath` for unknown paths. Default `false`
* `noCors`: disables CORS headers. Default `false`
* `stripSlashes`: removes trailing slashes from URLs. Default `false`

Example:

```js
server: {
  port: 6832,
  base: '/myapp',
  stripSlashes: true
}
```

* `command`: command to launch a non-Node.js server as a child process. Ex: `server: command: 'php -S 0.0.0.0:3000 -t public'`

## `sourceMaps`

`Boolean`: enables or disables Source Map generation. Default value is `true` (enabled), `false` (disabled) if you run `brunch build --production`.

`String`:
  * set to `'old'` to use the old `@` control character instead of `#`.
  * set to `'absoluteUrl'` to set the `sourceMappingURL` to the complete URL path starting from `config.paths.public`
  * set to `'inline'` to set the `sourceMappingURL` to a data URI containing the source map (no .map file will be written)

## `fileListInterval`

`Integer`: Sets an interval in ms which determines how often brunch file list should be
checked for new files. Default `65`.

On large projects and/or environments with slow disk I/O, the value may need to be increased
to ensure a `brunch build` completes properly in one cycle. However, higher values harm
`brunch watch` performance, so consider changing it in an environment-specific way using
`overrides`.

## `overrides`

`Object`: Alternate config settings to activate via command line switches (`--env SETTING`). Multiple sets of overrides can be applied at once using a comma-separated list (`--env foo,bar`).

It is also possible to set an additional environment value using the `BRUNCH_ENV` or `NODE_ENV` environment variable. This can be especially useful when combined with [dotenv](https://npmjs.org/package/dotenv).

Examples:

```sh
brunch watch --env testing
BRUNCH_ENV=testing brunch build
NODE_ENV=production brunch build
```

Defaults:

```js
overrides: {
  production: {
    optimize: true,
    sourceMaps: false,
    plugins: {autoReload: {enabled: false}}
  }
}
```

Caveats:

* If both `files[<type>].joinTo` and `overrides[<env>].files[<type>].joinTo` are defined, the value of `files[<type>].joinTo` will be overwritten by, not merged with, `overrides`.
* If both `files[<type>].order` and `overrides[<env>].files[<type>].order` are defined, the value of `files[<type>].order` will be overwritten by, not merged with, `overrides`.

In other words, `joinTo` and `order` don't merge if defined under `overrides`, but you still can override one while inheriting the base setting for the other.

## `watcher`

`Object`: Optional settings for
[chokidar](https://github.com/paulmillr/chokidar)
file watching library used in Brunch.

* `usePolling` (default: `false`) Whether to use `fs.watchFile`
    (backed by polling), or `fs.watch`.
    Polling is slower but can be more reliable.

## `hooks`

`Object`: Optional setting to specify handlers for different moments of building cycle.
Possible values:
* `preCompile` - `Function`: Optional callback to be called before brunch starts a compilation cycle. If Promise is returned, it will be awaited.

    Example:

    ```javascript
    hooks: {
      preCompile() {
        console.log("About to compile...");
        return Promise.resolve();
      }
    }
    ```
* `onCompile` - `Function`: Optional callback to be called every time brunch completes a compilation cycle. It is passed a `generatedFiles` array, as well as `changedAssets` array. Each member of `generatedFiles` array is an object with:
  - `path` — path of the compiled file
  - `sourceFiles` — array of objects representing each source file
  - `allSourceFiles` array of objects representing each source file — this one also includes files that don't belong to the original type (e.g. if a styles compiler adds a JS module, path would be the concatenated JS file, and one of the `allSourceFiles` will be a style file

  Each member of `changedAssets` array is an object with:

  - `path` — original path of an asset
  - `destinationPath` — path of an asset in the public directory

  Example:

  ```javascript
    hooks: {
      onCompile(generatedFiles, changedAssets) {
        console.log(generatedFiles.map(f => f.path));
      }
    }
  ```

## Tips

You can use CoffeeScript to write configuration files. This way they'll be
much shorter and concise. Simply create a file called `brunch-config.coffee`.
