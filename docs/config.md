# Configuration file

NOTE: This page may refer to new features that have not yet been published. To see the documentation that matches the current released version, take a look at this [document in the 'stable' branch](https://github.com/brunch/brunch/blob/stable/docs/config.md).

Brunch uses configuration file (`brunch-config.coffee` or `brunch-config.js`) located in the root directory to control various aspects of your application.

You can see all config default values in the `setConfigDefaults` function of [`src/helpers.coffee`](/src/helpers.coffee) in the brunch source code.

It is an executable script, so you can also do things like import Node.js modules in your configuration file.

## `paths`

`Object`: `paths` contains application paths to key directories. Paths are simple strings.

* `public` key: path to build directory that would contain output.
* `watched` key: list of all watched paths by brunch. Default:
  `['app', 'test', 'vendor']`

Example:

```coffeescript
paths:
  public: '/user/www/deploy'
```

## `files`

`Required, object`: `files` configures handling of application files: which compiler would be used on which file, what name should output file have etc. Any paths specified here must be listed in `paths.watched` as described above, for building.

* `<type>`: `javascripts`, `stylesheets` or `templates`
    * joinTo: (required) describes how files will be compiled & joined together.
      Available formats:
        * 'outputFilePath' in order to have all source files compiled together to one
        * map of ('outputFilePath': [anymatch set](https://github.com/es128/anymatch#anymatch))
    * order: (optional) defines compilation order. `vendor` files will be compiled before other ones even if they are not present here.
        * before: [anymatch set](https://github.com/es128/anymatch#anymatch) defining files that will be loaded before other files
        * after: [anymatch set](https://github.com/es128/anymatch#anymatch) defining files that will be loaded after other files
    * pluginHelpers: (optional) specify which output file plugins' include files concatenate into. Defaults to the output file that `vendor` files are being joined to, the first one with `vendor` in its name/path, or just the first output file listed in your joinTo object.

All files from `vendor` directory are by default concatenated before all files from `app` directory. So, `vendor/scripts/jquery.js` would be loaded before `app/script.js` even if order config is empty. Files from Bower packages are included by default before the `vendor` files.

Overall ordering is [before] -> [bower] -> [vendor] -> [everything else] -> [after] 

Example:

```coffeescript
files:
  javascripts:
    joinTo:
      'javascripts/app.js': /^app/
      'javascripts/vendor.js': /^vendor/
    order:
      before: [
        'vendor/scripts/console-helper.js',
        'vendor/scripts/jquery-1.7.0.js',
        'vendor/scripts/underscore-1.3.1.js',
        'vendor/scripts/backbone-0.9.0.js'
      ]
    pluginHelpers: 'javascript/vendor.js'

  stylesheets:
    joinTo: 'stylesheets/app.css'
    order:
      before: ['vendor/styles/normalize.css']
      after: ['vendor/styles/helpers.css']

  templates:
    joinTo: 'javascripts/app.js'
```

## `conventions`

`Object`: `conventions` define tests, against which all file pathnames will be checked.

* `ignored` key: [anymatch set](https://github.com/es128/anymatch#anymatch). Will check against files that should be ignored by brunch compiler, but are still watched by the watcher. For example, when you have `common.styl` file that you import in every stylus file, `common.styl` will be compiled on its own too which will result in duplicated code. When prefixing it with underscore (`_common.styl`) you are still able to import it in dependent files, but it won’t be compiled twice. The feature is very similar to [Sass partials](http://wiseheartdesign.com/articles/2010/01/22/structuring-a-sass-project/). By default, files and directories that start with underscore (`_`) will be ignored, as well as anything under the `vendor/node/` directory.
* `assets` key: [anymatch set](https://github.com/es128/anymatch#anymatch). Default value: `/assets[\\/]/`. If test gives true, file won't be compiled and will be just moved to public directory instead.
* `vendor` key: [anymatch set](https://github.com/es128/anymatch#anymatch). Default value: `/vendor[\\/]/`. If test gives true, file won't be wrapped in module, if there are any.

Keep in mind that default brunch regexps, as you see, consider **all** `vendor/` (etc.) directories as vendor (etc.) files. So, `app/views/vendor/thing/chaplin_view.coffee` will be treated as vendor file.

Example:

```coffeescript
conventions:
  ignored: -> false       # override defaults for no ignored files
  assets: /files[\\/]/  # vendor/jquery/files/jq.img
```

## `modules`

`Object`: consists of `wrapper` and `definition` subsettings.

`modules.wrapper`: `String, Boolean or Function`: a wrapper that will be wrapped around compiled-to-javascript code in non-vendor directories. Values:

* `commonjs` (Default) — CommonJS wrapper.
* `amd` — AMD `r.js`-like wrapper.
* `false` — no wrapping. Files will be compiled as-is.
* Function that takes path and data

`modules.definition`: `String, Boolean or Function` a code that will be added on top of every generated JavaScript file. Values:

* `commonjs` (Default) — CommonJS require definition.
* `amd`, `false` — no definition.
* Function that takes path and data

Example:

```coffeescript
# To use AMD, just add this and add require.js as
# your first vendor file.
modules:
  wrapper: 'amd'
  definition: 'amd'

# Same as 'commonjs'.
modules:
  wrapper: (path, data) ->
    """
require.define({#{path}: function(exports, require, module) {
  #{data}
}});\n\n
    """
```

`nameCleaner`: `Function` Allows you to set filterer function for module names,
for example, change all app/file to file. Example:

```coffeescript
# Default behaviour.
modules:
  nameCleaner: (path) ->
    path.replace(/^app\//, '')
```

## `plugins`

`Object`: Optional control to modify how plugins are loaded by default, as well as containing plugin-specific configuration.

* `off`: Plugins that may be installed, but should not be run.
* `on`: Forces listed plugins to be run, such as an optimizer even when the `optimize` flag is off.
* `only`: Explicitly list the plugins to be used, ignoring any others that are installed.
* _Per-Plugin_: Refer to each plugin's documentation for usage information.

Example:

```coffeescript
plugins:
  on: ['autoprefixer-brunch']
  off: ['jade-brunch', 'static-jade-brunch']
  autoReload:
    enabled: true
```

## `notifications`

`Boolean`: enables or disables
           [Growl](http://growl.info/downloads) /
           [Growl for Windows](http://www.growlforwindows.com/gfw/help/growlnotify.aspx) /
           [terminal-notifier](https://github.com/alloy/terminal-notifier#download) /
           [libnotify for Ubuntu](http://packages.ubuntu.com/search?keywords=libnotify-bin)
           notifications.
           Default value is `true` (enabled).

## `optimize`

`Boolean`: determines if minifiers should be enabled or not. Default value is `false` (`true` if you run `brunch build --optimize`).

## `server`

`Object`: contains params of webserver that runs on `brunch watch --server`.

* `path`: (optional) path to nodejs file that will be loaded to run your custom server. It must contain `exports.startServer` function:

    ```coffeescript
    exports.startServer = (port, path, callback) ->
      # callback doesn't take any parameters and (if provided) should be called after server is started
      # should return an instance of http.Server
    ```
  If not specified, Brunch will use [pushserve](https://github.com/paulmillr/pushserve). If using your own, only `port` from the following options can be set from the config.

* `port`: port on which server will run. Default: `3333`
* `base`: base URL from which to serve the app. Default: `''`
* `indexPath`: path to serve when base URL is requested. Default `index.html`
* `noPushState`: respond with 404 instead of `indexPath` for unknown paths. Default `false`
* `noCors`: disables CORS headers. Default `false`
* `stripSlashes`: removes trailing slashes from URLs. Default `false`

Example:

```coffeescript
server:
  path: 'server.coffee'
  port: 6832
  base: '/myapp'
  stripSlashes: true
```

## `sourceMaps`

`Boolean`: enables or disables Source Map generation. Default value is `true` (enabled).  
`String`: set to `'old'` to use the old `@` control character instead of `#`.

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

```coffeescript
overrides:
  production:
    optimize: true
    sourceMaps: false
    plugins: autoReload: enabled: false
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

## `workers`

`Object`: Optional settings affecting experimental workers feature for multi-threaded compilation. May improve compilation speed of large projects with lots of cpu-bound compile operations on multi-core systems, but do not be surprised if the overhead involved actually slows down your compile times.

* `enabled`: Boolean indicating whether to use experimental workers feature. Default value is `false` (disabled).
* `count`: (optional) The number of worker processes to use. Defaults to the number of CPUs/cores on the system minus 1.
* `extensions`: (optional) Array of file extensions to compile using worker processes. If not set, compiles all source files using workers.

Example:

```coffeescript
workers:
  enabled: true
  count: 6
  extensions: ['less']
```

## `onCompile`

`Function`: Optional callback to be called every time brunch completes a compilation cycle. It is passed a `generatedFiles` array. Each member of that array is an object with `path` (path of the compiled file) and `sourceFiles` (array of objects representing each source file)

Example

```coffeescript
onCompile: (generatedFiles) ->
  console.log generatedFiles.map (f) -> f.path
```
