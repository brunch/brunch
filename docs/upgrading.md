# Upgrading brunch

## Upgrading to any minor (_.x) version

* Update `package.json` brunch plugins versions to `>= 1.0 < 1.y` where y = brunch minor version + 1. For example, if you use brunch 1.5, you need to use plugins `>= 1.0 < 1.6`. If you use brunch 2.4, you need to use `>= 2.0 < 2.5`
* Run `npm install` to re-install all plugins.

## Upgrading to 1.7

* Replace * Added `config.paths.{app,test,vendor,assets}`
  with `config.paths.watched`.

## Upgrading to 1.6

* Switch to scaffolt and mocha-phantomjs instead of `brunch generate / test`.

## Upgrading to 1.5

* Rename `config.minify` setting to `config.optimize`.

## Upgrading to 1.4

* Remove all `config.files[lang].defaultExtension` settings.
* Remove `config.framework` setting.
* Move `config.paths.ignored` to `config.conventions.ignored` if you have it.
* (If you want to use `brunch generate`) Add `generatorRelations` setting. Example: https://github.com/paulmillr/brunch-with-chaplin/blob/master/config.coffee. Add `generators` directory with generators. Example: https://github.com/paulmillr/brunch-with-chaplin/blob/master/generators/

## Upgrading to 1.3

* Add test files joinTo configuration to your config file. You can look at https://github.com/paulmillr/brunch-with-chaplin/blob/master/config.coffee as an example.
* Add test files as in example https://github.com/paulmillr/brunch-with-chaplin/tree/master/test

## Upgrading to 1.1

* Change `buildPath: ...` in `config.coffee` to `paths: public: ...`
