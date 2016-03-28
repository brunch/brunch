# Upgrading brunch

It is uncommon for Brunch to introduce breaking changes, so most of the time you
won't need to worry about upgrading.

### Upgrading to 2.x (Dec 2015)

* Upgrade node.js to v4 and NPM to v3 or higher. Older versions would not work.
* `brunch new` has new syntax. Now: `brunch new <path> [-s skeleton]` (was: `brunch new <skeleton> <path>`).
  The command would now use a default skeleton when not specified.

### Upgrading from 1.0 (Mar 2012)

* Adjust config settings, if you have been using those:
    * Rename `config` file itself to `brunch-config`
    * Rename `config.minify` setting to `config.optimize`
    * Rename `config.paths.{app,test,vendor,assets}` to `config.paths.watched`
    * Rename `config.paths.ignored` to `config.conventions.ignored`
    * Rename `buildPath` to `paths.public`
    * Remove `defaultExtension` and `framework` settings
* Use `--production` instead of `--optimize` flag, which has been deprecated.
* `brunch generate / test` have been removed, use scaffolt and [mocha-phantomjs](https://github.com/brunch/brunch/blob/master/CHANGELOG.md#brunch-170-23-july-2013) instead.
