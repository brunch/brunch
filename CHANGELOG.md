## Brunch 1.1.0 (unreleased)
* Node.js API now mirrors CLI api.
* Improved command line API:
    * Added optional `--config` param to all commands expect `brunch new`.
    Usage: `brunch build --config ios_config`.
    * Removed `--output` param in `brunch build` and `brunch watch` commands.
    * Param `--template` in `brunch new` has been renamed to `--skeleton`.
    `--skeleton` supports relative / absolute path and git repo URLs.
    Also, git metadata is automatically removed in cloned / copied projects.
* Improved config API:
    * `buildPath` is now deprecated, `pathes.build` is used instead of it.
    * Added `pathes.app`, `pathes.root`, `pathes.assets`, `pathes.test`,
    `pathes.vendor`.
    * Scripts that are not in the config[lang].order are now compiled in
    alphabetical order instead of random.
* Improved module loader:
    * Real exceptions are now throwed instead of strings when module
    wasn't found.
    * Fixed an issue when loader cached same modules more than once.
    * Fixed an issue when loader loaded non-existing modules.
* Fixed loading of non-coffeescript configs.

## Brunch 1.0.2 (March 28, 2012)
* Removed `Cakefile` from default template.
* Changed recommended framework in `test/spec` to Mocha.

## Brunch 1.0.1 (March 26, 2012)
* Updated dependencies.
* Fixed permissions issue with `app/assets` folder.

## Brunch 1.0.0 (March 14, 2012)
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

## Brunch 0.9.1 (February 21, 2012)
* Updated brunch-extensions to 0.2.2.

## Brunch 0.9.0 (January 10, 2012)
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
