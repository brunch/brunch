# Unreleased
* Remove support for many options that haven't worked since the version 3.0.0 switch to Dart Sass. For sourcemap-related options, see Brunch's [`sourceMaps`](https://brunch.io/docs/config#sourcemaps).

# sass-brunch 3.0.0 (Mar 19, 2020)
* Update for brunch 3
* Switch to the pure-JavaScript release of Dart Sass, remove support for libsass and ruby-sass

# sass-brunch 2.6.2 (Apr 5, 2016)
* Add source map support for `native`

# sass-brunch 2.6.0 (Apr 2, 2016)
* Added support for CSS modules with `plugins: {sass: {modules: true}}`

# sass-brunch 2.0.0 (Jan 29, 2016)
* Updated source code & API. The plugin would now only work with Brunch 2.2 and higher.

===

# sass-brunch 1.9.2 (27 November 2015)
* Add `precision` option

# sass-brunch 1.9.1 (24 September 2015)
* Fix output style setting (compressed when in optimize mode)

# sass-brunch 1.9.0 (14 September 2015)
* Upgrade to node-sass 3.x, providing libsass support for both .sass and .scss syntax

# sass-brunch 1.8.11 (18 August 2015)
* Fix bug with processing of sass files that do not result in any compiled css

# sass-brunch 1.8.10 (13 March 2015)
* Fix logging of syntax error output from node-sass

# sass-brunch 1.8.9 (19 February 2015)
* Make compatible with node-sass 2.x (while retaining 1.x compatibility)

# sass-brunch 1.8.8 (20 November 2014)
* Add `native` mode option to force use of libsass

# sass-brunch 1.8.7 (6 November 2014)
* Resolve dependencies located in custom `includePaths`

# sass-brunch 1.8.6 (18 October 2014)
* Update node-sass to ^1.0 (which bumps [libsass to 3.0](https://github.com/sass/libsass/releases/tag/3.0))

# sass-brunch 1.8.5 (12 October 2014)
* Support dependency detection from `@import` statments with multiple child refs

# sass-brunch 1.8.4 (1 October 2014)
* Add `allowCache` option to allow the ruby gem's default cache behavior

# sass-brunch 1.8.3 (13 September 2014)
* Skip compiling empty source files because of possible libsass bug

# sass-brunch 1.8.2 (2 September 2014)
* Update node-sass to ~0.9.3
* Pass `includePaths` option to ruby compiler
* Fix race condition with mixed compass/non-compass utilizing source files

# sass-brunch 1.8.1 (16 March 2014)
* Update node-sass to ~0.8.3

# sass-brunch 1.8.0 (7 February 2014)
* Uses node-sass when possible (no compass) for much faster compilation with no dependency on ruby gems
* Added `include_paths` option
* Fix issue with spawning child process on windows
* Fix issue with custom `gem_home`

# sass-brunch 1.7.2 (19 November 2013)
* Fix `useBundler` option
* Stop outputting debug info by default, make it opt-in

# sass-brunch 1.7.1 (15 November 2013)
* Added `options` config param to allow any sass CLI options to be set.
* Added `useBundler` option which uses `bundle exec sass` to compile.
  _However, the feature does not yet work properly with the 1.7.1 release._
* Fixed bug with buffering very large source files.

# sass-brunch 1.7.0 (28 August 2013)
* New way of parsing dependent files.

# sass-brunch 1.6.1 (24 July 2013)
* Fixed ENV bugs.

# sass-brunch 1.6.0 (22 June 2013)
* Added ENV_HOME support.

# sass-brunch 1.5.2 (23 April 2013)
* Added ability to print line number refs via `plugins.sass.debug = 'comments'`

# sass-brunch 1.5.1 (19 March 2013)
* Added node 0.10 support, removed coffee-script dependency.

# sass-brunch 1.5.0 (13 January 2013)
* Improved installation process.

# sass-brunch 1.4.2 (26 November 2012)
* The plugin will now output debug information unless config.minify
is enabled.

# sass-brunch 1.4.1 (8 August 2012)
* Fixed node.js 0.8 compatibility.
* Fixed compass bug.

# sass-brunch 1.4.0 (15 July 2012)
* Added support for absolute paths.

# sass-brunch 1.3.1 (15 July 2012)
* Error is now thrown if sass wasn't found on system.
* Fixed windows issues.

# sass-brunch 1.3.0 (29 June 2012)
* Added node.js 0.8 and 0.9 support.
* Package is now precompiled before every publishing to npm.

# sass-brunch 1.1.3 (10 May 2012)
* Added Compass support.

# sass-brunch 1.1.2 (10 May 2012)
* Changed stylus load path from `app/styles` to `config.paths.root`.
* Added support for chain compilation.
* Fixed an issue when sass was cropping long files.

# sass-brunch 1.1.1 (15 April 2012)
* Fixed error reporting when installing the package.

# sass-brunch 1.1.0 (9 April 2012)
* Added windows support.

# sass-brunch 1.0.0 (12 March 2012)
* Initial release
