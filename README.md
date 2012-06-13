# Brunch
HTML5 applications made easy.

## Getting started
You'll need [node.js](http://nodejs.org/) 0.6.10+. Type:

    npm install -g brunch

You're done!

To create a new project, execute `brunch new <project name>`.

To build it, execute `brunch build` in project directory.

To continuously rebuild the project on every change, run `brunch watch`.

To run a simple http server, execute `brunch watch --server`.

## Contributing ![build status](https://secure.travis-ci.org/brunch/brunch.png?branch=master)
You can install the latest `master` version of brunch by following these
simple steps:

* Clone the repo, navigate to its directory.
* Change `bin/brunch` in `package.json` to `bin/brunchcoffee`.
It will allow you not to compile the source every time you change it.
* Execute `npm install` to install packages.
* Execute `npm uninstall -g brunch && npm link`
* Change `package.json` `bin/brunchcoffee` back to `bin/brunch`.

Test suite can be run via `npm test`.

## Contact
- Website: [brunch.io](http://brunch.io).
- Project twitter: [@brunch](http://twitter.com/brunch)

## License
Brunch is released under the MIT License (see LICENSE for details).
