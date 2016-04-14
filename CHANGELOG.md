To install the latest version, execute `npm install -g brunch`

## Brunch 2.6.6 (Apr 14, 2016)
* Fix a type error when checkin if a file was written.
* Don't categorize node_modules as 'assets' even if they match the regexp
* Fixed brokenness of some plugins like `static-jade-brunch`.
* Fixes parent recompilation when a dependency changes.
* Improved `npm install` behavior while Brunch is watching:
    * Make sure Brunch waits for it before proceeding.
    * Make it aware of `production` env flag for Heroku.
* Small bugfix for dependency parser.

## Brunch 2.6.0 (Apr 2, 2016)
* Non-JS files can now output JS modules.
    * You are now able to import stylesheets from Sass, Less, CSS in JS.
    * For this to work, don't forget to enable proper config option for each plugin.
* Added experimental support for `entryPoints`, a smarter alternative to `joinTo`:
    * `joinTo` concatenates all files that match the pattern into one
    * `entryPoints` allow you to specify first input file. Then Brunch
      automatically calculates which modules and dependencies will be used
      in the output. This way, unused files would not get compiled.
* Add support for `BRUNCH_JOBS` environment variable to be able to specify number of jobs to process your build.
* Fixed an issue when Brunch was forking processes even if `-j` flag was not passed which caused some extreme CPU and memory issues.
* Deprecated `onCompile` config option in favor of new `hooks.onCompile`.

## Brunch 2.5.2 (Mar 22, 2016)
* Fixed double inclusion of some files on Windows.
* Fixed an issue when `joinTo` production override did not have any effect.
* Fixed JSON file loading.

## Brunch 2.5.0 (Mar 16, 2016)
* **Improved NPM support:**
    * Added support for scoped npm packages, like `@cycle/dom`.
    * Brunch will now try to `npm install` if you try to require a package that is present in `package.json` but was not installed.
    * `optionalDependencies` are now correctly ignored when not present.
    * `peerDepdenencides` are treated as required ones.
    * Improperly-cased requires (like `React` instead of `react`) will now throw compile errors.
    * Fixed npm mail file resolving which was not working before in some cases (`rx`).
* **Support for file extensions:**
    * Brunch will now register CommonJS modules using full names of the files, and create aliases without extensions to allow you to use both styles of requires.
    * Basically these cases are possible & different now: `require('file.json')` and `require('file.js')`
* **Parallel builds:** Bringing up to 50% performance improvement with just one simple flag.
    * You can use the `-j 2 / 4` flag with `build` / `watch` to parallelize CPU-bould tasks in your build. See [docs/commands.md](docs/commands.md#workers) for more details.
* **React hot load support:**
    * Bumped `commonjs-require-definition` to allow resetting modules, which can be used for live JS reloading with the updated `auto-reload-brunch`
* **Improved output** for JavaScript files.
* Allow to specify again `conventions.vendor` as an anymatch set.

## Brunch 2.4.2 (Feb 23, 2016)
* You can now simply set `config.modules = false` to disable module wrapping.
* Brunch would now correctly include file-based aliases for NPM packages. For example, this means you would be able to load `require('moment/locales/en')` even though the file is not declared in moment's `package.json`.
* Fixed auto-expanding of GH URLs in skeletons: `brunch new --skeleton paulmillr/brunch-with-chaplin`
* Removed `component.js` support, which was barely supported since v2.0.
* Added warning for versions of NPM <3, because Brunch does not work on those.
* Improved error handling.

## Brunch 2.3.2 (Feb 17, 2016)
* Small fix for `xBrowserResolve is not a function` error.
* Fixed handling of custom web-servers for `brunch watch -s`.
* Improved exposure of `process.env.NODE_ENV` when used in Brunch apps.
* NPM: Fixed support for different versions of the same package.

## Brunch 2.3.0 (Feb 12, 2016)
* Enabled NPM support by default
* NPM: Added aliases support
* NPM: Added support for including static files.
* NPM: Added support for different versions of the same package.
* NPM: Watcher would detect removed packages from users source code and
  then do a corresponding recompilation.
* NPM: Added support for `json` files.
* `onCompile` config option now receives modified `assets` as a second argument.
* `server` config option now allows to specify custom `hostname`s
* New warning: When `brunch w -s -p 3334` is used (instead of `-P`)
* New warning: When `defaultExtension` option is used.
  It has been removed in Brunch 1.1, but many configs still have it.

## Brunch 2.2.3 (Feb 2, 2016)
* Windows-related fixed to NPM
* Don't include some NPM packages twice (`process` etc).
* Built-in node.js modules can now be loaded in your client-side apps.
* Improve compatibility with Brunch 1.x.
* Some fixes for the NPM to work better on Windows systems.

## Brunch 2.2.0 (Jan 22, 2016)
* Massively improved NPM integration:
    1. Brunch would now automatically detect and extract all npm packages.
    2. Because of this, `whitelist` property is no longer required.
    3. Windows implementation should now work correctly.
* `brunch new` launched with old syntax would now throw a descriptive error.
* Improved progress indicator. It would not allow plugins to write output on top of it.
* Added support for promises in plugins.

## Brunch 2.1.3 (Jan 9, 2016)
* Fixes an issue when NPM packages were included incorrectly on Windows.
* `brunch build -d` is now able to receive an optional `filterer` argument
* `brunch new` and `brunch build` hangup fixes.
* NPM integration fixes
* Fixes an issue when sass-brunch or similar plugins weren't compiling files correctly.

## Brunch 2.1.0 (Jan 1, 2016)
* Brunch would now indicate progress for long builds, like that:
    `(4s) Compiling => Compiling. => Compiling..`
* Massively improved debug output (`-d`) readability.
* Now throwing correct import errors ([gh-1053](https://github.com/brunch/brunch/issues/1053), [gh-1041](https://github.com/brunch/brunch/issues/1041)).
* NPM integration was hugely reworked. Disabled by default for now.
    1. With `config.npm.enabled = true`, all non-brunch NPM packages
      would be loaded automatically.
    2. To exclude packages, specify the blacklist:
        `config.npm = {blacklist: ['express']}`
    3. To include packages manually, specify the whitelist:
        `config.npm = {whitelist: ['react', 'react-dom', 'pikaday']}`

## Brunch 2.0.4 (Dec 10, 2015)
* Fixes using production flag (`-p`) with multiple optimizers [(gh-1056)](https://github.com/brunch/brunch/issues/1056).
* Brunch would now auto-expand the following syntax to a full GitHub user / repo URL:
    `brunch new --skeleton paulmillr/brunch-with-chaplin`
* Fix: Post `onCompile` string replaces not working.
* Fix: Linters now get the correct `linter` context.
* Compilation log would now use seconds instead of milliseconds for long compilations.
* Launching Brunch on node v4< would now throw an explicit error.

## Brunch 2.0.0 (Nov 19, 2015)

Brunch v2 **requires node 4.0 / npm 3.0 or higher**.

* `brunch new` reworked, simplified and receives new syntax:
    * `brunch new .` to create a new project in current directory from dead-simple skeleton
    * `brunch new path` to create the project in `path`
    * `brunch new . --skeleton react` to create the project from `React` skeleton
    * Now allowing to clone skeletons to dirs with `.git` directory.
* General speed & stability improvements.
* Rewritten in JavaScript (ES6 + Promises).
* Switched `-p` and `-P`. `-p` now specifies `--production` build and `-P` now specifies watch server port.
* `modules.autoRequire` should now work correctly on Windows.

Thanks to Vincent Ricard for help.

## Brunch 1.8.5 (Aug 5, 2015)
* Only listen to stdin (and exit when stdin is closed) when the `--stdin` CLI switch is passed

## Brunch 1.8.4 (Jul 31, 2015)
* Add `modules.autoRequire` option that would automatically append `require('module')` to your javascript outputs.

## Brunch 1.8.3 (May 19, 2015)
* Fix restarting watcher upon config change
* Fix issue with npm includes that have no dependencies

## Brunch 1.8.2 (Apr 21, 2015)
* Fix regression with `-d`/`--debug` CLI switch

## Brunch 1.8.1 (Apr 20, 2015)
* Enabled NPM support by default. Just load any installed npm package in your code
  via `require('package')`.

## Brunch 1.8.0 (Apr 8, 2015)
* Added experimental **NPM support** for client-side libraries.
    Just specify dependencies in `package.json` and load them within your app
    with `require('package')`. Brunch would do all the hard job for you.
    Behind config option for now (`config.npm = {enabled: true}`).
* Ultra-simple custom webservers.
    Brunch will now consume file `brunch-server.{js,coffee}` if it exists
    and it would be used to launch a custom webserver that launches with `brunch watch --server`.
    Also, no more need to write `startServer` — just export the function with `module.exports`
* Added `preCompile` plugins ([gh-873](https://github.com/brunch/brunch/issues/873)).
* Compilers can now return dependencies:
    `{data: 'file-data', dependencies: ['a.js', 'b.js']}`
* Fixed env handling for optimizers ([gh-903](https://github.com/brunch/brunch/issues/903))
* Only listen to stdin if in persistent mode ([gh-920](https://github.com/brunch/brunch/issues/920))
* Added **fcache** - a simple way to speed-up your plugins like sass or jade.
    fcache is a simple filesystem wrapper that allows to read files and
    to update them in cache.
    Brunch would usually update them on every change, after that your plugin
    will pull the data from RAM and would be super fast.
* Massive improvements to file watcher.

## Brunch 1.7.20 (Dec 8, 2014)
* Bump chokidar to 0.12.0

## Brunch 1.7.19 (Nov 17, 2014)
* Bump chokidar to 0.11.0
* Fix issue with undetected changes when using vim on Linux
* Ensure `build` does not complete prematurely on slow file systems

## Brunch 1.7.18 (Oct 20, 2014)
* File watching improvements via chokidar 0.10.1

## Brunch 1.7.17 (Sep 26, 2014)
* Fix warnings about files joined only under default config settings
* Warning when custom server fails to callback
* Add `-d`/`--debug` CLI switch to easily enable debug output

## Brunch 1.7.16 (Sep 13, 2014)
* Suppress warnings about unjoined filed meant for only specific envs

## Brunch 1.7.15 (Sep 10, 2014)
* Fix race condition that aborted build cycle on some systems
* Better error/warning messages for source files that do not get concatenated
  (no `joinTo` match)
* Improved handling of `plugins.on` and `plugins.off` when used with `overrides`
* New [config](https://github.com/brunch/brunch/blob/stable/docs/config.md) options
  * `server.command` for setting non-node.js custom server
  * Pass `server.config` settings to custom server
  * Create `absoluteUrl` option for source maps
  * Support for array of files in `pluginHelpers` config setting
* IMPORTANT NOTE: If providing a custom node server for `brunch watch`, ensure it
  invokes the callback when ready, as brunch now waits for that before proceeding
  with build steps.

## Brunch 1.7.14 (May 21, 2014)
* [component](https://github.com/component/component) integration
* [anysort](https://github.com/es128/anysort)/[anymatch](https://github.com/es128/anymatch)
  integration, providing much more flexible ways to define source files in
  config such as in `joinTo` and `order`
* [New config options](https://github.com/brunch/brunch/blob/stable/docs/config.md#plugins)
  to control which plugins are used (can be env-specific)
* Allow `onCompile` method to be defined in Brunch config file for triggering
  custom project-specific functionality after every compile cycle
* Default settings updates:
    * Ignore directories that start with underscore (to match filename handling)
    * Fix heroku issues

## Brunch 1.7.13 (Dec 9, 2013)
* Fixed optimizers not actually optimizing the code.

## Brunch 1.7.12 (Nov 30, 2013)
* Fixed syntax error in source code.

## Brunch 1.7.11 (Nov 29, 2013)
* If you remove some file and create a file with the same name,
  it will be handled correctly.
* Linter warnings are now handled correctly.

## Brunch 1.7.10 (Oct 19, 2013)
* Fixed optimizers.

## Brunch 1.7.9 (Oct 16, 2013)
* Re-release of 1.7.8 because of npm code publishing bug.

## Brunch 1.7.8 (Oct 10, 2013)
*NOTE:* Re-published on 16 October 2013 due to npm bug.
If installed prior to this date, it will actually run as if it is 1.7.6.
* Switched source maps format to new (`//#`).
  Old format is still available via `config.sourceMaps = 'old'`
* Assets dotfile ignore exception to enable copying of `.rewrite` files.

## Brunch 1.7.7 (Sep 28, 2013)
*NOTE:* Re-published on 16 October 2013 due to npm bug.
If installed prior to this date, it will actually run as if it is 1.7.6.
* Fixed absolute paths exposal for plugin includes in source maps.
* Workers are now shut down on brunch re-watch.

## Brunch 1.7.6 (Sep 20, 2013)
* Fixed overriding `config.files` in custom environments.
* Fixed issues with old compiler plugin versions.
* Adopted `brunch-config` as the standard config file name.
    * Config files named `config` still work, but will be deprecated starting
      with 1.8.

## Brunch 1.7.5 (Sep 17, 2013)
* Added experimental workers support.
* Fixed custom enviroment bug.

## Brunch 1.7.4 (Aug 29, 2013)
* Quick fix for `--optimize`d building.

## Brunch 1.7.3 (Aug 28, 2013)
* Added `-e, --env` param to `build` and `watch`
  that will replace --config in 1.8.
  `env` is a dead-simple way of specifying your work environment.
  You can use `--env production` and then specify
  `config.overrides.production`, all properties of which will
  override default config. You may use more than one --env.
* Source maps for languages which don't support source maps
  (“identity source maps”) now generated from
  compiled source (js) instead of original source (coffee)
* Deprecated `--optimize` (use `--env production` or `--production`)
  and `--config` options.

## Brunch 1.7.2 (Aug 19, 2013)
* Fixed windows issues with compilation.
* Auto-watching `bower.json` for changes now.
* Concatenate JS files in main property of bower component in valid order
  (how they were specified in `bower.json`).
* Respect config.order.before in brunch config for bower files.

## Brunch 1.7.1 (Aug 11, 2013)
* Local brunch package now takes precedence over global and
  will be auto-loaded on global `brunch` command.
* Added `pluginHelpers` directive to `joinTo` configs. It allows to
  specify to which file you want stuff from plugins to be added
  (`handlebars-runtime.js`, for example).
* `.htaccess` is now properly copied from assets.
* Fixed issues on windows with copying many assets.

## Brunch 1.7.0 (Jul 23, 2013)
* Added **source maps** support! Big thanks to
  [Pierre Lepers](https://github.com/plepers) and
  [Elan Shanker](https://github.com/es128).
* Added **Twitter Bower** package manager support.
  The support is very different from modern builders.
  You don’t need to specify concat order or list all files, brunch will do that
  for you automatically.
  **But**, some packages don’t specify which files they include and
  on which packages they depend.
  You may specify `overrides` property in root `bower.json`, see
  [read-components docs](http://github.com/paulmillr/read-components)
* Added proper **AMD support**. Just include almond.js with your AMD app
  and brunch will do require.js optimizer job for you.
* Added ability to use multiple compilator plugins for one file.
* Added `require.list` support to default require definition of app. This allows
  you to automatically load tests and stuff. See new [how-to-run-tests guide](https://github.com/brunch/brunch/blob/master/docs/faq.md#what-is-the-recommended-way-of-running-tests)
* Added `config.paths.watched` which replaces
  `config.paths.{app,test,vendor,assets}`.
* Added `config.modules.nameCleaner`, which allows you to set
  filterer function for module names, for example, change all
  definitions of app/file to file (as done by default).
* Added `config.fileListInterval` config prop that allows to set an
  interval in ms which determines how often brunch file list
  should be checked for new files (internal property).
* Added detailed messages of what was done to `compiled in` logs.
* Removed files are now actually removed from compiled output.
* Removed `config.modules.addSourceURLs` directive. Use source maps instead.
* Improved compilation performance.
* Improved error messages when there’s a need in `npm install`.
* Changed syntax of `brunch new` to `brunch new <uri> [dir]`
* Fixed advanced `conventions.assets` issues (e.g. `/styles\/img/`).

## Brunch 1.6.7 (May 8, 2013)
* Fixed `brunch new --skeleton`.

## Brunch 1.6.6 (May 7, 2013)
* Added `plugin#teardown` API support. With it you can stop servers in your
  plugins and stuff. It will be called after each brunch stop.
* Added `config.notificationsTitle`.
* Fixed double requiring of some plugins.
* Fixed reloading of `package.json` data.

## Brunch 1.6.5 (May 6, 2013)
* Fixed `--config` option of build / watch commands.
* Fixed `watch` command description.

## Brunch 1.6.4 (May 5, 2013)
* Don’t throw on missing devdependencies. Closes [gh-541](https://github.com/brunch/brunch/issues/541).
* Reload config correctly on change. Closes [gh-540](https://github.com/brunch/brunch/issues/540).

## Brunch 1.6.3 (Apr 7, 2013)
* Fixed watching after `npm install`.
* `config.optimize` is taken into account if it was set manually.

## Brunch 1.6.2 (Apr 1, 2013)
* Fixed watching of config files.

## Brunch 1.6.1 (Mar 25, 2013)
* Fixed `brunch new`.

## Brunch 1.6.0 (Mar 24, 2013)
* Removed `brunch generate` and `brunch destroy`.
  [scaffolt](https://github.com/paulmillr/scaffolt) is its simpler successor.
* Removed `brunch test`.
  [Mocha-phantomjs](http://metaskills.net/mocha-phantomjs/) is its simpler
  successor.
* Adjust config settings, if you have been using those:
    * Rename `config` file itself to `brunch-config`
    * Rename `config.minify` setting to `config.optimize`
    * Rename `config.paths.{app,test,vendor,assets}` to `config.paths.watched`
    * Rename `config.paths.ignored` to `config.conventions.ignored`
    * Rename `buildPath` to `paths.public`
    * Remove `defaultExtension` and `framework` settings
* Use `--production` instead of `--optimize` flag, which has been deprecated.

## Brunch 1.5.4 (Mar 19, 2013)
* Fixed `brunch generate`, switched to standalone modules for some features.
* Added node 0.10 support.

## Brunch 1.5.3 (Feb 2, 2013)
* When using `brunch generate`, generator will no longer overwrite
  existing files.
* Preserved context of `include` method of plugins.

## Brunch 1.5.2 (Jan 13, 2013)
* Improved installation process.

## Brunch 1.5.1 (Jan 11, 2013)
* Tester no longer runs watcher by default.
* Changed `brunch test -f REGEX` option to `-g / --grep` for consistency with
  Mocha.

## Brunch 1.5.0 (Jan 2, 2013)
* Added ability to wrap files in sourceURLs which simplifies debugging a lot.
  Disabled by default in non-production mode, but can be disabled with
  `config.modules.addSourceURLs = false`.
* Added `-f REGEX, --filter REGEX` option to `brunch test`.
* `--minify` (`-m`) command line option was changed to `--optimize` (`-o`).
  The previous version is deprecated and will be removed in the future.
  This is made for plugins that will do optimizations of you application
  that are not minifications.
* `config.modules.wrapper` now accepts full file path as first argument, instead
  of sanitized.
* Debugging mode syntax was changed to standardized
  `DEBUG=brunch:* brunch <command>`.
* Fixed bug when process didn’t return code "1" on compilation errors.
* Brunch will now work only with brunch plugins that have `brunch` in their
  name.
* Improved error handling of running brunch in non-brunch app dirs.

## Brunch 1.4.5 (Dec 14, 2012)
* Updated base brunch with chaplin skeleton to the latest libs.

## Brunch 1.4.4 (Oct 1, 2012)
* All errors are now deferred to the compilation end.
  Also, if you have added one error on previous compilation and one error on
  current, brunch will show both of them until they will be fixed.
* Fixed terminal-notifier.app integration.
* Fixed test passing.
* Fixed `config.notifications` on ubuntu.

## Brunch 1.4.3 (Sep 2, 2012)
* Added support of binary files to generators.
* Improved error logging.
* Updated built-in webserver to express.js 3.0.

## Brunch 1.4.2 (Aug 18, 2012)
* Fixed incorrect scaffolding on windows.
* `.git` directories are now discarded when using `brunch new` with git URL.

## Brunch 1.4.1 (Aug 8, 2012)
* `brunch new` now allowed to take current working directory (`.`) or any
  existing directory as first argument.
* Assets are now affected by `conventions.ignored` too.
* Fixed linting bug.

## Brunch 1.4.0 (Aug 4, 2012)
* Added new phenomenally simplified scaffolder:
    1. Create `generators/` directory in your brunch application
       (directory name is customizable by `config.paths.generators`).
    2. Create generator directory there with `generator.json` and
       files that will be generated.
* Added conventions:
    * Conventions are configurable via `config.conventions[name]`.
      Convention can be a RegExp or Function.
    * `assets` convention: all files in directories that named as `assets`
      (default value) will be copied to public path directly.
    * `vendor` All files in directories that named as `vendor`
      (default value) won't be wrapped in modules.
    * `tests` convention: all files that end with `_test.<extension>`
      (default value) are considered as test files and will be loaded
      automatically with `brunch test`.
    * `ignored` convention: all files that start with `_` (default value)
      are considered as partial files and won't be compiled. Useful for
      Stylus / Sass languages. This replaces functionality of
      `config.paths.ignored`.
* Added AMD support by allowing more flexibility with file wrapping:
    * `config.modules` can be an object of:
        * `config.modules.wrapper` - string, boolean or function, defines how to
          wrap files in app directory in modules.
        * `config.modules.definition` - string, boolean or function, defines
          what to add on top of every file.
* Added linting support. Linting is a static analysis of code. Example
  tools for this are JSHint, CSSLint etc. The lint API is
  `plugin.lint(data, path, callback)`. One file can use more than one linter.
* Added config option that disables growl / libnotify notifications.
  Usage: `config.notifications = false`.
* Added support for Mac OS X Mountain Lion notification center.
  You'll need to place
  [terminal-notifier.app](https://github.com/alloy/terminal-notifier/downloads)
  to `/Applications/` to get it work.
* Removed support for:
    * `config.files[lang].defaultExtension`.
      Brunch will automatically detect extension from your generator file name.
    * `config.framework`, `config.generators`. It's not needed because all
      generators are local to your application and because brunch now has
      `generators/` directory.
    * Array type of `paths.vendor` / `paths.assets`. They're replaced by
      conventions.
* If any error happened in `brunch build`, it will exit with error code `1`
  instead of `0`.
* Fixed commonjs `require_definition` in <IE9.

## Brunch 1.3.4 (Jul 7, 2012)
* Fixed bug with too fast compilations.

## Brunch 1.3.3 (Jun 29, 2012)
* Added node.js 0.8 and 0.9 support.
* `jsdom`, required for `brunch test` can now be installed once for all apps via
  `npm install -g jsdom`. You'll need to have its parent dir in `NODE_MODULES`
  env variable.
* Fixed `compiled in` timer and `brunch generate` bugs.

## Brunch 1.3.2 (Jun 27, 2012)
* Fixed `brunch test` on new projects.

## Brunch 1.3.1 (Jun 22, 2012)
* Config can now be in any language you use in app (e.g. livescript).
* Added `--reporter` (`-r`) option to `brunch test` which allows to choose
  Mocha reporter.
* Made require definition much easier for debugging.

## Brunch 1.3.0 (Jun 19, 2012)
* Brunch with Chaplin is now the default application skeleton, that will be
  created on `brunch new <app>`. Old one is still available with
  `brunch new <app> -s github://brunch/simple-coffee-skeleton`.
  Chaplin is an awesome set of classes on top of Backbone.js that makes making
  big webapps very simple.
* Added testing support (thanks to Andreas Gerstmayr):
    * [Mocha](http://visionmedia.github.com/mocha/) is used as test engine.
      It's a feature-rich, flexible and fun.
    * `brunch test` (or `brunch t`) is used to run all tests in CLI env.
    * `test` directory is now watched. Add `'javascripts/tests.js': /^test/`
      to `config.javascripts.joinTo` in `config.coffee` to compile them.
* Improved command line API:
    * Added `github://user/repo` skeleton address schema support to
      `brunch new`.
    * Debug mode now has logger namespaces. Usage:
      `BRUNCH_DEBUG=<ns> brunch <command>` where `<ns>` is:
      `watcher`, `writer`, `*`.
* Improved file watcher:
    * Vim backup files are now ignored by watcher.
    * Fixed watching of non-compiled files in `app`.
* Improved config API:
    * Added support for `config.server.base`, which determines base URL from
      which to serve the app. The default value is empty string.
    * `config.paths.ignored` now doesn't need to check versus if file is
      `config.coffee` or `package.json`, it does it automatically in brunch
      code.
    * Fixed `config.paths.ignored` on windows.
    * `config.paths.vendor` is now an array, but it will be soon deprecated.
* Changed `onCompile` plugin API. Now it receives an array of
  `fs_utils.GeneratedFile`. This makes it very rich and allows to build smarter
  reloaders. For example, the ones that reload browser tabs only on stylesheet
  change.
* Semicolon is now added after every compiled vendor library because of some
  libs that break with brunch. Hello, Zepto!
* Styles in `vendor` directory are now sorted correctly, before `app` files.
* Only generated files that depend on changed in current compilation files are
  written now. Before, brunch was writing all files each time.

## Brunch 1.2.2 (May 24, 2012)
* Brunch now outputs compilation time.
* Assets are copied one-by-one on change, instead of copying the whole assets
  directory. This improves watcher performance by about 25%+.
* Disabled caching in built-in webserver.
* Improved `brunch generate`:
    * Added `--plural` option to `brunch generate`. Plural version of generator
      name is used in controllers and collections. By default, brunch does
      pluralizing instead of you.
    * Added `collection` generator to `brunch generate`. It is not included in
      `brunch g scaffold`, because it's not needed most of the time.
    * Added `collectionView` generator to `brunch generate` for Chaplin users.
      It doesn't generate corresponding `template`.
* If `package.json` or `config.coffee` were removed during the watching, brunch
  process will exit.
* Maximum time between changes of two files that will be considered as a one
  compilation changed from 100ms to 65ms.

## Brunch 1.2.1 (May 12, 2012)
* Fixed persistence of process with `brunch watch` (without server).
* Fixed watching of files on windows.

## Brunch 1.2.0 (May 12, 2012)
* Greatly improved `brunch generate`:
    * User can now define his own generators in `config.generators`.
    * Default generators are now:
        * `controllerTest`, `modelTest`, `viewTest`, `template`, `style`
        * `controller` (generates `controllerTest` too)
        * `model` (generates `modelTest` too)
        * `view` (generates `template`, `style` & `viewTest` too)
        * `scaffold` (generates `controller`, `model`, `view` and their
          generators)
* Improved config API:
    * Added `paths.ignored` param that redefines paths ignored by brunch.
    * `paths.assets` can now be an array of paths.
* Improved plugin API:
    * Added support for `onCompile` method.
      It allows great & simple live browser reloaders.
* Added pushState support to the built-in webserver.
* Files that end with two underscores (e.g. `a.js__`) are now ignored by
  watcher and compiler because they're created by some IDEs.
* Files in `vendor` directory are now sorted correctly, before `app` files.

## Brunch 1.1.2 (Apr 20, 2012)
* Fixed `buildPath is deprecated` warning on new configs.
* Fixed compiling of invalid files (`.rb`, `.png` etc).

## Brunch 1.1.1 (Apr 19, 2012)
* Fixed compiling of `package.json`, `config` and watching of assets.
* Fixed incorrect date in brunch logger.
* Fixed an error when requiring custom server script.

## Brunch 1.1.0 (Apr 15, 2012)
* Added windows support.
* Added node.js 0.7 / 0.8 support.
* Added support for chain compilation. For example, if `_user.styl` changes and
  `main.styl` depends on it, `main.styl` will be recompiled too.
* `brunch watch` now also watches config & `package.json`.
* Improved command line API:
    * Added optional `--config` param to all commands expect `brunch new`.
      Usage: `brunch build --config ios_config`.
    * Brought back `--minify` param in `brunch build` and `brunch watch`.
    * Deprecated `--output` param in `brunch build` and `brunch watch`.
    * Param `--template` in `brunch new` has been renamed to `--skeleton`.
      `--skeleton` supports relative / absolute path and git repo URLs.
      Also, git metadata is automatically removed in cloned / copied projects.
* Improved config API:
    * `buildPath` is now deprecated, `paths.public` is used instead of it.
    * Added `paths.app`, `paths.root`, `paths.assets`, `paths.test`,
      `paths.vendor`.
    * Scripts that are not in the config[lang].order are now compiled in
      alphabetical order instead of random.
    * Made optional presence of almost all config params.
* Improved module loader:
    * Real exceptions are now thrown instead of strings when module wasn't
      found.
    * Fixed an issue when loader cached same modules more than once.
    * Fixed an issue when loader loaded non-existing modules.
* Greatly improved default coffee skeleton architecture:
    * Moved all collections to `models`.
    * Replaced `routers` with `lib/router`.
    * No more global variable for application bootstrapper, it can be loaded
      with `require 'application'`.
    * Switched default templates to Handlebars. Handlebars.js is a nice
      mustache-compatible template engine that supports helpers
      (`lib/view_helper`).
* Fixed loading of non-coffeescript configs.
* Made optional existence of `app` & `vendor` directories.
* Node.js API now mirrors command line api.

## Brunch 1.0.3 (Apr 3, 2012)
* Dotfiles from assets dir are prevented to be copied to build dir.

## Brunch 1.0.2 (Mar 28, 2012)
* Removed `Cakefile` from default template.
* Changed recommended framework in `test/spec` to Mocha.

## Brunch 1.0.1 (Mar 26, 2012)
* Updated dependencies.
* Fixed permissions issue with `app/assets` folder.

## Brunch 1.0.0 (Mar 14, 2012)
* Simplified config files.
* Default app now uses two separate files to simplify debugging: `app.js` and
  `vendor.js`.
* Changed default naming of build directory & its subdirs. Now the style matches
  expressjs and rails.
    * `build` directory is now `public`.
    * `scripts` has been renamed to `javascripts`.
    * `styles` has been renamed to `stylesheets`.
* Rewritten API for plugins to be framework-agnostic & much more simple:
    * All `brunch-extensions` plugins have been split into separate repos.
    * Added support for generator templates.
    * Added support for different extensions in brunch generators.
    * Added support for including files with plugins.
* Improved command line API:
    * Added `--template` / `-t` option to `brunch new`.
    * Added `--path` `-p` option to `brunch generate`.
    * Added support for custom webservers to `brunch watch --server`.
* Files, whose names start with `_` and files in `app/assets` are now ignored by
  compiler (but not by watcher).
* Update backbone to 0.9.1, underscore to 1.3.1 and jquery to 1.7.1.
* Added IcedCoffeeScript plugin.
* Fixed Jade templates. See [jade-brunch](https://github.com/brunch/jade-brunch)
  for more info.
* Added support for javascript config files.
* Added debugging mode. You can enable it by prepending `BRUNCH_DEBUG=1 ` to
  brunch command.

## Brunch 0.9.1 (Feb 21, 2012)
* Updated brunch-extensions to 0.2.2.

## Brunch 0.9.0 (Jan 10, 2012)
* Added new API for plugins.
* Added support for Jade, LESS and Roy. All language compilers / plugins are now
  located in separate repo,
  [brunch-extensions](https://github.com/brunch/brunch-extensions).
* Added JS & CSS minifier.
* CoffeeScript (instead of YAML) is now used for application configs.
* Improved file watcher speed by 5-fold.
* Implemented new directory structure:
    * The build directory is now generated automatically.
    * All assets (index.html, images etc.) are placed in app/assets/.
    * `main.coffee` was renamed to `initialize.coffee` for clarity.
    * `src/vendor` and `src/app` moved to `vendor` and `app`.
    * All scripts from `src/vendor` are moved to `app/vendor/scripts`.
    * Added support for CoffeeScript in `vendor/scripts`.
    * Added support for Stylus / LESS in `vendor/styles`.
    * Templates have moved from `app/templates` to `app/views/templates`.
* Updated command line API:
    * `brunch build` and `brunch watch` now compile files in current working
      directory (instead of in `./brunch/` subdir).
    * Added `brunch generate` command. It's basically a shortcut for creating
      new model / view / router. Example usage: `brunch generate view user`.
    * Added `brunch watch --server` flag that would run http server on build
      directory. It has an optional `--port` setting.
* Added support for node 0.6.
* Added growl support.
* Changed reset.styl to normalize.css & helpers.css from html5boilerplate.
* Improvements for vendor data: support CSS in vendor/styles directory,
  support CoffeeScript (in addition to js) in vendor/scripts directory.
* Add firebug support to stylus compiler.
* Improved time formatting in console logs.
