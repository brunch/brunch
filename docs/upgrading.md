# Upgrading brunch

## Upgrading to 2.0

* You must upgrade node.js 4.0 or higher. Older versions would not work.
* `brunch new` has new syntax. Now: `brunch new <path> [-s skeleton]`. Was: `brunch new <skeleton> <path>`.
  The command would now use a default skeleton when not specified.

## Upgrading to 1.7

* Rename `config` to `brunch-config` starting with 1.7.6 (`config` is still supported).
* Use `--production` instead of `--optimize` flag for building starting with 1.7.3
  (`--optimize` is still supported, but deprecated).
* Replace `config.paths.{app,test,vendor,assets}` with `config.paths.watched`.

## Upgrading to 1.6

* Switch to scaffolt and mocha-phantomjs instead of `brunch generate / test`.
* See the new [testing guide](https://github.com/brunch/brunch/blob/master/CHANGELOG.md#brunch-170-23-july-2013)

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
