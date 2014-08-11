# Asking an issue

If you want your issue to be resolved fast please write down:

* Brunch version, node.js version, OS version
* `config.coffee` and `package.json` contents
* `bower.json` / `component.json` contents if you think the error is related to package managers

# Contributing
You can install the latest `master` version of brunch by following these
simple steps:

* Clone the repo, navigate to its directory.
* Change `bin/brunch` in `package.json` to `bin/brunch.coffee`.
It will allow you not to compile the source every time you change it.
* Execute `npm install` to install packages.
* Execute `npm uninstall -g brunch && npm link`
* Change `package.json` `bin/brunch.coffee` back to `bin/brunch`.
* Use `git pull` to update to latest brunch.
* Use `DEBUG='brunch:*' brunch build` to log all build steps.

Test suite can be run via `npm test`.

The usual contributing steps are:

* Fork the [official repository](https://github.com/brunch/brunch).
* Clone your fork: git clone `git@github.com:<your-username>/brunch.git`
* Make sure tests are passing for you: npm install && npm test
* Create a topic branch: git checkout -b topics/new-feature-name
* Add tests and code for your changes.
* Once you‘re done, make sure all tests still pass: npm install && npm test
* Make sure your code conforms [coffee style guide](https://github.com/paulmillr/code-style-guides#coffeescript).
* Commit and push to your fork.
* Create an pull request from your branch.
* Sit back and enjoy.

If you want to create your own plugin, you can use
[brunch-boilerplate-plugin](https://github.com/brunch/brunch-boilerplate-plugin)
as a base.
