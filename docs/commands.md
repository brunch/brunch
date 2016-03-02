# Command line API

## `brunch new`

Full syntax: `brunch new [path] [-s skeleton]`

Create new brunch project. Options:

* `path` (optional, default: `.`): name of project directory that would be created.
* `-s, --skeleton`: (optional) skeleton (name or git URL), contents of which will be copied to new dir..

`.git` directory is automatically removed when copying.

Brunch skeleton is basically an application boilerplate that provides a good starting point for new applications. A few popular skeletons:

* `brunch new .` — if you want no opinions. Just initializes configs and empty directories from [dead-simple](https://github.com/brunch/dead-simple).
* `brunch new -s react` — React + React Router + Stylus + ES6 / JSX
* `brunch new -s hipster` — Angular, Bootstrap, node-webkit, CoffeeScript + Less + Jade
* `brunch new -s chaplin` — Backbone, Chaplin, CoffeeScript. One of the most popular skeletons
* `brunch new -s ember` — A skeleton for rapid Ember development. CoffeeScript + Stylus + Handlebars
* `brunch new -s cordova` — Bare skeleton that includes support for building apps using Apache Cordova aka Phonegap.
* `brunch new -s banana-pancakes` — A simple skeleton for Bootstrap.
* `brunch new -s exim` — Neat Flux-based Exim framework on top of React and optional CoffeeScript.

Other 50+ boilerplates are available at http://brunch.io/skeletons

Each skeleton must have `brunch-config.{js,coffee}` file.

Short-cut: `brunch n`.

## `brunch build`

Build a brunch project. Options:

* `-e SETTING, --env SETTING`: apply settings from `config.overrides[SETTING]`
* `-p, --production`: run optimize/minify plugins during compilation, disable source maps and auto-reload; same as `-e production` and settings can be modified in `config.overrides.production`

Short-cut: `brunch b`.

Examples:

* `brunch b -p`: would create optimized/production build.
* `brunch b -e ios`: build using the settings from `config.overrides.ios`

## `brunch watch`

Watch brunch directory and rebuild if something changed. Options:

* all the same options available in `brunch build`, plus:
* `-s, --server`: run a simple http server that would serve `public` dir in `/` and `test` dir in `/test/`
* `-P PORT, --port PORT`: if a `server` option was specified, define on which port the server would run

Short-cut: `brunch w`.

Examples:

* `brunch w`: simply watch current directory &amp; compile the output to `public` directory.
* `brunch w -s`: watch current project and run a webserver that would work on public directory.
* `brunch w -sP 8841`: same as above, but run webserver on port 8841.
* `brunch w -e ios`: watch current directory &amp; compile the output using settings from `config.overrides.ios`

## Workers

Both `brunch build` and `brunch watch` allow you to supply a flag to enable *experimental* workers support for multi-process compilation. It may improve compilation speed of large projects with lots of CPU-bound compile and optimize operations on multi-core systems, but don't be surprised if the overhead involved actually slows down your compilation time.

To use it, pass the `-j` flag followed by a number of workers you want to spawn. Typically, this number should be no more than the number of cores on your machine. You can simply pass `-J` without a number to let Brunch figure out the number of cores.

(Mac users, be ware that on newer MacBooks that support hyperthreading, OS X will report twice the number of actual hardware cores, e.g. 4 instead of 2, so you are better off explicitly passing the number of workers.)

Experiment with the flag and the number of workers to see what configuration works best for your project *and* your machine.
