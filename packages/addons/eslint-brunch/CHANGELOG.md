# eslint-brunch 3.11.1
* Fix `warnOnly=true` not used as default option

# eslint-brunch 3.11.0
* Uses the latest v3.* release of ESLint

# eslint-brunch 3.10.0
* Improves the logging format, with a style based on
  [ESLint's default "stylish" formatter](http://eslint.org/docs/user-guide/formatters/#stylish)
* Bug fix: if ESLint only reported warnings for a file (no errors),
  then those warnings were silently discarded

# eslint-brunch 3.9.1
* Requires ESLint as a dependency instead of a peerDependency

# eslint-brunch 3.9.0
* Allows ESLint to automatically find and load all
  [configuration files](http://eslint.org/docs/user-guide/configuring#using-configuration-files)
  including `package.json`
* Implements `config` plugin option, for configuring
  [ESLint's engine](http://eslint.org/docs/developer-guide/nodejs-api#cliengine)

# eslint-brunch 3.8.0
* Uses [`ansicolors`](https://www.npmjs.com/package/ansicolors) instead of
  [`chalk`](https://www.npmjs.com/package/chalk) for terminal colors

# eslint-brunch 3.7.0
* Allowed eslint 2.x and 3.x in peerDependencies

# eslint-brunch 3.6.0
* Added eslint 2.x in peerDependencies
* Removed eslint in dependencies

# eslint-brunch 3.5.0
* Update eslint to ^2.5

# eslint-brunch 3.4.0
* Update eslint to ^2.4

# eslint-brunch 3.3.0
* Update eslint to ^2.3

# eslint-brunch 3.2.0
* Add support for .eslintrc.* files

# eslint-brunch 3.1.0
* Update eslint to ^2.2

# eslint-brunch 3.0.0
* Update eslint to 2.1
