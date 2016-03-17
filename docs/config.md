# Configuration file

Brunch uses configuration file (`brunch-config.js` or `brunch-config.coffee`) located in the root directory to control various aspects of your application.

You can see all config default values in the `setConfigDefaults` function of [`lib/config.js`](/lib/config.js#L223) in the brunch source code.

It is an executable script, so you can also do things like import Node.js modules in your configuration file.

## `paths`

`Object`: `paths` contains application paths to key directories. Paths are simple strings.

* `public` key: path to build directory that would contain output.
* `watched` key: list of all watched paths by brunch. Default:
  `['app', 'test', 'vendor']`

Example:

```javascript
paths: {
  public: '/user/www/deploy'
}
```

## `files`

`Required, object`: `files` configures handling of application files: which compiler would be used on which file, what name should output file have etc. Any paths specified here must be listed in `paths.watched` as described above, for building.

* `<type>`: `javascripts`, `stylesheets` or `templates`
    * joinTo: (required) describes how files will be compiled & joined together.
      Available formats:
        * 'outputFilePath' in order to have all source files compiled together to one
        * map of ('outputFilePath': [anymatch set](https://github.com/es128/anymatch#anymatch-))
    * order: (optional) defines compilation order. `vendor` files will be compiled before other ones even if they are not present here.
        * before: [anymatch set](https://github.com/es128/anymatch#anymatch-) defining files that will be loaded before other files
        * after: [anymatch set](https://github.com/es128/anymatch#anymatch-) defining files that will be loaded after other files
    * pluginHelpers: (optional) specify which output file (or array of files) plugins' include files concatenate into. Defaults to the output file that `vendor` files are being joined to, the first one with `vendor` in its name/path, or just the first output file listed in your joinTo object.

All files from `vendor` directory are by default concatenated before all files from `app` directory. So, `vendor/scripts/jquery.js` would be loaded before `app/script.js` even if order config is empty. Files from Bower packages are included by default before the `vendor` files.

Overall ordering is [before] -> [bower] -> [vendor] -> [everything else] -> [after]

Example:

```javascript
files: {
  javascripts: {
    joinTo: {
      'javascripts/app.js': /^app/,
      'javascripts/vendor.js': /^vendor/
    },
    order: {
      before: ['vendor/console-helper.js']
    }
  },
  stylesheets: {
    joinTo: 'stylesheets/app.css',
    order: {
      before: ['vendor/normalize.css'],
      after: ['vendor/print-helpers.css']
    }
  },
  templates: {
    joinTo: 'javascripts/app.js'
  }
}
```

## `conventions`

`Object`: `conventions` define tests, against which all file pathnames will be checked.

* `ignored` key: [anymatch set](https://github.com/es128/anymatch#anymatch-). Will check against files that should be ignored by brunch compiler, but are still watched by the watcher. For example, when you have `common.styl` file that you import in every stylus file, `common.styl` will be compiled on its own too which will result in duplicated code. When prefixing it with underscore (`_common.styl`) you are still able to import it in dependent files, but it won’t be compiled twice. The feature is very similar to [Sass partials](http://wiseheartdesign.com/articles/2010/01/22/structuring-a-sass-project/). By default, files and directories that start with underscore (`_`) will be ignored, as well as anything under the `vendor/node/`, `vendor/ruby-*/`, `vendor/jruby-*/`, and `vendor/bundle/` directories.
* `assets` key: [anymatch set](https://github.com/es128/anymatch#anymatch-). Default value: `/assets[\\/]/`. If test gives true, file won't be compiled and will be just moved to public directory instead.
* `vendor` key: [anymatch set](https://github.com/es128/anymatch#anymatch-). Default value: `/(^bower_components|node_modules|vendor)[\\/]/`. If test gives true, file won't be wrapped in module, if there are any.

Keep in mind that default brunch regexps, as you see, consider **all** `vendor/` (etc.) directories as vendor (etc.) files. So, `app/views/vendor/thing/chaplin_view.coffee` will be treated as vendor file.

Example:

```javascript
conventions: {
  ignored: (() => false), // override defaults for no ignored files
  assets: /files[\\/]/  // vendor/jquery/files/jq.img
}
```

If you want to add to the ignore pattern instead of replace, you must copy the defaults into your config.

Default ignore pattern:

```javascript
conventions: {
  ignored: [
    /[\\/]_/,
    /vendor[\\/]node[\\/]/,
    /vendor[\\/](j?ruby-.*|bundle)[\\/]/
  ]
}
```

## `npm`

`Object`: configures NPM integration for front-end packages. Make sure you also declare the packages you depend on in your package.json `dependencies` section.

* `npm.enabled`: `Boolean`: a toggle of whether the integration is enabled, defaults to `true`.
* `npm.globals`: `Object`: a mapping from global name (as a key) to the corresponding module name (string) to expose.
* `npm.styles`: `Object`: a mapping from package name (string) to an array of stylesheet paths (relative to package root) to be included into the build.
* `npm.static`: `Array`: a list of files from installed npm modules to include statically, bypassing deppack.

Example:

```javascript
npm: {
  styles: {pikaday: ['css/pikaday.css']}
  globals: {Pikaday: 'pikaday'}
}
```

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

```javascript
// Same as 'commonjs'.
modules: {
  wrapper: (path, data) => {
    return `
require.define({${path}: function(exports, require, module) {
  #{data}
}});\n\n
    `
  }
}
```

`modules.autoRequire`: `Object` specifies requires to be automatically added at the end of joined file. The example below will require both 'app' and 'foo':

```javascript
// Default behaviour.
modules: {
  autoRequire: {
    'javascripts/app.js': ['app', 'foo']
  }
}
```

`modules.nameCleaner`: `Function` Allows you to set filterer function for module names,
for example, change all 'app/file' to 'file'. Example:

```javascript
// Default behaviour.
modules: {nameCleaner: (path) => path.replace(/^app\//, ''); }
```

```javascript
// Add namespacing to a project.
const name = require('./package.json').name;
modules: {nameCleaner: (path) => path.replace(/^app/, name); }
```

## `plugins`

`Object`: Optional control to modify how plugins are loaded by default, as well as containing plugin-specific configuration.

* `off`: Plugins that may be installed, but should not be run.
* `on`: Forces listed plugins to be run, such as an optimizer even when the `optimize` flag is off.
* `only`: Explicitly list the plugins to be used, ignoring any others that are installed.
* _Per-Plugin_: Refer to each plugin's documentation for usage information.

Example:

```javascript
plugins: {
  on: ['autoprefixer-brunch'],
  off: ['jade-brunch', 'static-jade-brunch'],
  autoReload: {enabled: true}
}
```

## `notifications`

`Boolean`: enables or disables
           [Growl](http://growl.info/downloads) /
           [Growl for Windows](http://www.growlforwindows.com/gfw/help/growlnotify.aspx) /
           [terminal-notifier](https://github.com/alloy/terminal-notifier#download) /
           [libnotify for Ubuntu](http://packages.ubuntu.com/search?keywords=libnotify-bin)
           notifications.
           Default value is `true` (enabled).

When set to `true`, only errors trigger notifications. If you want to display success, warning, or informational messages, set this to an array of strings with the levels you want to see, e.g. `['error', 'warn', 'info']`. See [documentation for the Loggy package](https://github.com/paulmillr/loggy) for complete details.

## `notificationsTitle`

`String`: sets the title used in notifications. Default value is `Brunch`. [The notifications setting](#notifications) must be enabled for this to have any effect.

## `optimize`

`Boolean`: determines if minifiers should be enabled or not. Default value is `false` (`true` if you run `brunch build --production`).

## `server`

`Object`: contains params of webserver that runs on `brunch watch --server`.

If a `brunch-server.js` or `brunch-server.coffee` file exists at the root of your project, Brunch will treat this as your custom web server. This can be overriden with the `server.path` option.

The server script must export a function that starts your custom server, either as the default exported module. This function should return an instance of [`http.Server`](https://nodejs.org/api/http.html#http_class_http_server) or an object containing a `close` property assigned to a function that shuts down the server. Examples:

  ```javascript
  // javascript example using default export and node http core module
  module.exports = (port, path, callback) => {
    // your custom server code
    // callback doesn't take any parameters and (if provided) should be called after server is started
    // up to you to respect the `port` argument allowing users to change it from the CLI
    const myServer = http.createServer();
    myServer.listen(port, callback);
    myServer.on('request', function(req, res) {/* do stuff */});
    return myServer;
  }
  ```

  ```javascript
  // Example using custom `close` method.
  module.exports = (port, path, callback) => {
    // custom server code
    return {close: () => { /* code for shutting down server */ }}
  }
  ```

* `path`: (optional) custom path to nodejs file that will be loaded to run your custom server.

If a custom server is not present, Brunch will use [pushserve](https://github.com/paulmillr/pushserve). If using your own, only `port` from the following options can be set from the config.

* `port`: port on which server will run. Default: `3333`
* `hostname`: hostname on which server will run. Default `localhost`, which only permits connections from the same computer. Set to `0.0.0.0` to permit access from other computers.
* `base`: base URL from which to serve the app. Default: `''`
* `indexPath`: path to serve when base URL is requested. Default `index.html`
* `noPushState`: respond with 404 instead of `indexPath` for unknown paths. Default `false`
* `noCors`: disables CORS headers. Default `false`
* `stripSlashes`: removes trailing slashes from URLs. Default `false`

Example:

```javascript
server: {
  port: 6832,
  base: '/myapp',
  stripSlashes: true
}
```

* `command`: command to launch a non-nodejs server as a child process. Ex: `server: command: 'php -S 0.0.0.0:3000 -t public'`

## `sourceMaps`

`Boolean`: enables or disables Source Map generation. Default value is `true` (enabled), `false` (disabled) if you run `brunch build --production`.
`String`:
  * set to `'old'` to use the old `@` control character instead of `#`.
  * set to `'absoluteUrl'` to set the `sourceMappingURL` to the complete URL path starting from `config.paths.public`

## `fileListInterval`

`Integer`: Sets an interval in ms which determines how often brunch file list should be
checked for new files. Default `65`.

On large projects and/or environments with slow disk I/O, the value may need to be increased
to ensure a `brunch build` completes properly in one cycle. However, higher values harm
`brunch watch` performance, so consider changing it in an environment-specific way using
`overrides`.

## `overrides`

`Object`: Alternate config settings to activate via command line switches (`--env SETTING`). Multiple sets of overrides can be applied at once using a comma-separated list (`--env foo,bar`).

It is also possible to set an additional environment value using the `BRUNCH_ENV` environment variable. This can be especially useful when combined with [dotenv](https://npmjs.org/package/dotenv).

Examples:

```sh
brunch watch --env testing
BRUNCH_ENV="testing" brunch build
```

Defaults:

```javascript
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
file watching library used in brunch.

* `usePolling` (default: `false`) Whether to use fs.watchFile
    (backed by polling), or fs.watch.
    Polling is slower but can be more reliable.

## `onCompile`

`Function`: Optional callback to be called every time brunch completes a compilation cycle. It is passed a `generatedFiles` array, as well as `changedAssets` array. Each member of `generatedFiles` array is an object with:

* `path` — path of the compiled file
* `sourceFiles` — array of objects representing each source file
* `allSourceFiles` array of objects representing each source file — this one also includes files that don't belong to the original type (e.g. if a styles compiler adds a JS module, path would the the concated JS file, and one of the `allSourceFiles` will be a style file

Each member of `changedAssets` array is an object with:

* `path` — original path of an asset
* `destinationPath` — path of an asset in the public directory

Example

```javascript
onCompile: (generatedFiles, changedAssets) => {
  console.log(generatedFiles.map(f => f.path));
}
```
