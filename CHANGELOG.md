# Brunch 1.7.0 (23 July 2013)
* Added **source maps** support! Big thanks to [Pierre Lepers](https://github.com/plepers) and [Elan Shanker](https://github.com/es128).
* Added **Twitter Bower** package manager support.
  The support is very different from modern builders.
  You don’t need to specify concat order or list all files, brunch will do that for you automatically.
  **But**, some packages don’t specify which files they include and
  on which packages they depend.
  You may specify `overrides` property in root `bower.json`, see
  [read-components docs](http://github.com/paulmillr/read-components)
* Added proper **AMD support**. Just include almond.js with your AMD app
  and brunch will do require.js optimizer job for you.
* Added ability to use multiple compilator plugins for one file.
* Added `require.list` support to default require definition of app. This allows to automatically load tests and stuff.
* Added `config.paths.watched` that replaces
  `config.paths.{app,test,vendor,assets}`
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
* Fixed advanced `conventions.assets` issues (e.g. `/styles\/img/`)

# Brunch 1.6.7 (8 May 2013)
* Fixed `brunch new --skeleton`

# Brunch 1.6.6 (7 May 2013)
* Added `plugin#teardown` API support. With it you can stop servers in your plugins and stuff. It will be called after each brunch stop.
* Added `config.notificationsTitle`.
* Fixed double requiring of some plugins.
* Fixed reloading of `package.json` data.

# Brunch 1.6.5 (6 May 2013)
* Fixed `--config` option of build / watch commands.
* Fixed `watch` command description.

# Brunch 1.6.4 (5 May 2013)
* Don’t throw on missing devdependencies. Closes gh-541.
* Reload config correctly on change. Closes gh-540.

# Brunch 1.6.3 (7 April 2013)
* Fixed watching after `npm install`.
* `config.optimize` is taken into account if it was set manually.

# Brunch 1.6.2 (1 April 2013)
* Fixed watching of config files.

# Brunch 1.6.1 (25 March 2013)
* Fixed `brunch new`.

# Brunch 1.6.0 (24 March 2013)
* Removed `brunch generate` and `brunch destroy`.
  [scaffolt](https://github.com/paulmillr/scaffolt) is its simpler
  successor.
* Removed `brunch test`.
  [Mocha-phantomjs](http://metaskills.net/mocha-phantomjs/) is its simpler
  successor.

# Brunch 1.5.4 (19 March 2013)
* Fixed `brunch generate`, switched to standalone modules for some features.
* Added node 0.10 support.

# Brunch 1.5.3 (2 February 2013)
* When using `brunch generate`, generator will no longer overwrite
existing files.
* Preserved context of `include` method of plugins.

# Brunch 1.5.2 (13 January 2013)
* Improved installation process.

# Brunch 1.5.1 (11 January 2013)
* Tester no longer runs watcher by default.
* Changed `brunch test -f REGEX` option to `-g / --grep` for consistency with Mocha.

# Brunch 1.5.0 (2 January 2013)
* Added ability to wrap files in sourceURLs which simplifies debugging a lot.
Disabled by default in non-production mode, but can be disabled with `config.modules.addSourceURLs = false`.
* Added `-f REGEX, --filter REGEX` option to `brunch test`.
* `--minify` (`-m`) command line option was changed to `--optimize` (`-o`).
The previous version is deprecated and will be removed in the future.
This is made for plugins that will do optimizations of you application
that are not minifications.
* `config.modules.wrapper` now accepts full file path as first argument,
instead of sanitized.
* Debugging mode syntax was changed to standardized
`DEBUG=brunch:* brunch <command>`.
* Fixed bug when process didn’t returned code "1" on compilation errors.
* Brunch will now work only with brunch plugins that have
`brunch` in their name.
* Improved error handling of running brunch in non-brunch app dirs.

# Brunch 1.4.5 (14 December 2012)
* Updated base brunch with chaplin skeleton to the latest libs.

# Brunch 1.4.4 (1 October 2012)
* All errors are now deferred to the compilation end.
Also, if you have added one error on previous compilation
and one error on current, brunch will show both of them until
they will be fixed.
* Fixed terminal-notifier.app integration.
* Fixed test passing.
* Fixed `config.notifications` on ubuntu.

# Brunch 1.4.3 (2 September 2012)
* Added support of binary files to generators.
* Improved error logging.
* Updated built-in webserver to express.js 3.0.

# Brunch 1.4.2 (18 August 2012)
* Fixed incorrect scaffolding on windows.
* `.git` directories are now discarded when using `brunch new` with git URL.

# Brunch 1.4.1 (8 August 2012)
* `brunch new` now allowed to take current working directory
(`.`) or any existing directory as first argument.
* Assets are now affected by `conventions.ignored` too.
* Fixed linting bug.

# Brunch 1.4.0 (4 August 2012)
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
        * `config.modules.wrapper` - string, boolean or function,
        defines how to wrap files in app directory in modules.
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
    * `config.framework`, `config.generators`. It's not needed because
    all generators are local to your application and because
    brunch now has `generators/` directory.
    * Array type of `paths.vendor` / `paths.assets`. They're replaced by
    conventions.
* If any error happened in `brunch build`,
it will exit with error code `1` instead of `0`.
* Fixed commonjs `require_definition` in <IE9.

# Brunch 1.3.4 (7 July 2012)
* Fixed bug with too fast compilations.

# Brunch 1.3.3 (29 June 2012)
* Added node.js 0.8 and 0.9 support.
* `jsdom`, required for `brunch test` can now be installed once
for all apps via `npm install -g jsdom`. You'll need to have its
parent dir in `NODE_MODULES` env variable.
* Fixed `compiled in` timer and `brunch generate` bugs.

# Brunch 1.3.2 (27 June 2012)
* Fixed `brunch test` on new projects.

# Brunch 1.3.1 (22 June 2012)
* Config can now be in any language you use in app (e.g. livescript).
* Added `--reporter` (`-r`) option to `brunch test` which allows to choose
Mocha reporter.
* Made require definition much easier for debugging.

# Brunch 1.3.0 (19 June 2012)
* Brunch with Chaplin is now the default application skeleton, that will be
created on `brunch new <app>`. Old one is still available with
`brunch new <app> -s github://brunch/simple-coffee-skeleton`.
Chaplin is an awesome set of classes on top of Backbone.js that
makes making big webapps very simple.
* Added testing support (thanks to Andreas Gerstmayr):
    * [Mocha](http://visionmedia.github.com/mocha/) is used as test engine.
    It's a feature-rich, flexible and fun.
    * `brunch test` (or `brunch t`) is used to run all tests in CLI env.
    * `test` directory is now watched. Add `'javascripts/tests.js': /^test/`
    to `config.javascripts.joinTo` in `config.coffee` to compile them.
* Improved command line API:
    * Added `github://user/repo` skeleton address schema support to `brunch new`.
    * Debug mode now has logger namespaces. Usage:
    `BRUNCH_DEBUG=<ns> brunch <command>` where `<ns>` is:
    `watcher`, `writer`, `*`.
* Improved file watcher:
    * Vim backup files are now ignored by watcher.
    * Fixed watching of non-compiled files in `app`.
* Improved config API:
    * Added support for `config.server.base`, which determines base URL
    from which to serve the app. The default value is empty string.
    * `config.paths.ignored` now doesn't need to check versus if
    file is `config.coffee` or `package.json`, it does it automatically
    in brunch code.
    * Fixed `config.paths.ignored` on windows.
    * `config.paths.vendor` is now an array, but it will be soon deprecated.
* Changed `onCompile` plugin API. Now it receives an array of
`fs_utils.GeneratedFile`. This makes it very rich and allows to build smarter
reloaders. For example, the ones that reload browser tabs only on stylesheet
change.
* Semicolon is now added after every compiled vendor library because of
some libs that break with brunch. Hello, Zepto!
* Styles in `vendor` directory are now sorted correctly, before `app` files.
* Only generated files that depend on changed in current compilation files
are written now. Before, brunch was writing all files each time.

# Brunch 1.2.2 (24 May 2012)
* Brunch now outputs compilation time.
* Assets are copied one-by-one on change, instead of copying the whole
assets directory. This improves watcher performance by about 25%+.
* Disabled caching in built-in webserver.
* Improved `brunch generate`:
    * Added `--plural` option to `brunch generate`. Plural version of generator
    name is used in controllers and collections. By default, brunch does pluralizing
    instead of you.
    * Added `collection` generator to `brunch generate`. It is not included in
    `brunch g scaffold`, because it's not needed most of the time.
    * Added `collectionView` generator to `brunch generate` for Chaplin users.
    It doesn't generate corresponding `template`.
* If `package.json` or `config.coffee` were removed during the watching,
brunch process will exit.
* Maximum time between changes of two files that will be considered
as a one compilation changed from 100ms to 65ms.

# Brunch 1.2.1 (12 May 2012)
* Fixed persistence of process with `brunch watch` (without server).
* Fixed watching of files on windows.

# Brunch 1.2.0 (12 May 2012)
* Greatly improved `brunch generate`:
    * User can now define his own generators in `config.generators`.
    * Default generators are now:
        * `controllerTest`, `modelTest`, `viewTest`, `template`, `style`
        * `controller` (generates `controllerTest` too)
        * `model` (generates `modelTest` too)
        * `view` (generates `template`, `style` & `viewTest` too)
        * `scaffold` (generates `controller`, `model`, `view` and their generators)
* Improved config API:
    * Added `paths.ignored` param that redefines
    paths ignored by brunch.
    * `paths.assets` can now be an array of paths.
* Improved plugin API:
    * Added support for `onCompile` method.
    It allows to create great & simple live browser reloaders.
* Added pushState support to the built-in webserver.
* Files that end with two underscores (e.g. `a.js__`) are now ignored by
watcher and compiler because they're created by some IDEs.
* Files in `vendor` directory are now sorted correctly, before `app` files.

# Brunch 1.1.2 (20 April 2012)
* Fixed `buildPath is deprecated` warning on new configs.
* Fixed compiling of invalid files (`.rb`, `.png` etc).

# Brunch 1.1.1 (19 April 2012)
* Fixed compiling of `package.json`, `config` and watching of assets.
* Fixed incorrect date in brunch logger.
* Fixed an error when requiring custom server script.

# Brunch 1.1.0 (15 April 2012)
* Added windows support.
* Added node.js 0.7 / 0.8 support.
* Added support for chain compilation. For example, if `_user.styl` changes
and `main.styl` depends on it, `main.styl` will be recompiled too.
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
    * Real exceptions are now thrown instead of strings when module
    wasn't found.
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

# Brunch 1.0.3 (3 April 2012)
* Dotfiles from assets dir are prevented to be copied to build dir.

# Brunch 1.0.2 (28 March 2012)
* Removed `Cakefile` from default template.
* Changed recommended framework in `test/spec` to Mocha.

# Brunch 1.0.1 (26 March 2012)
* Updated dependencies.
* Fixed permissions issue with `app/assets` folder.

# Brunch 1.0.0 (14 March 2012)
* Simplified config files.
* Default app now uses two separate files to simplify debugging: `app.js` and
`vendor.js`.
* Changed default naming of build directory & its subdirs. Now the style
matches expressjs and rails.
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
* Files, whose names start with `_` and files in `app/assets` are now ignored
by compiler (but not by watcher).
* Update backbone to 0.9.1, underscore to 1.3.1 and jquery to 1.7.1.
* Added IcedCoffeeScript plugin.
* Fixed Jade templates. See
[jade-brunch](https://github.com/brunch/jade-brunch) for more info.
* Added support for javascript config files.
* Added debugging mode. You can enable it by prepending `BRUNCH_DEBUG=1 ` to
brunch command.

# Brunch 0.9.1 (21 February 2012)
* Updated brunch-extensions to 0.2.2.

# Brunch 0.9.0 (10 January 2012)
* Added new API for plugins.
* Added support for Jade, LESS and Roy. All language compilers / plugins are
now located in separate repo,
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
    * Added `brunch generate` command. It's basically a shortcut for creating new
    model / view / router. Example usage: `brunch generate view user`.
    * Added `brunch watch --server` flag that would run http server on
    build directory. It has an optional `--port` setting.
* Added support for node 0.6.
* Added growl support.
* Changed reset.styl to normalize.css & helpers.css from html5boilerplate.
* Improvements for vendor data: support CSS in vendor/styles directory,
support CoffeeScript (in addition to js) in vendor/scripts directory.
* Add firebug support to stylus compiler.
* Improved time formatting in console logs.
