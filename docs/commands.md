# Command line API

## `brunch new` / `brunch n`

Full syntax: `brunch new [path] [-s skeleton]`

Create new brunch project. Options:

* `path` (optional, default: `.`): name of project directory that would be created.
* `-s, --skeleton` (optional, default: `simple`): skeleton name or URL from [brunch.io/skeletons](http://brunch.io/skeletons)

Brunch skeleton is basically an application boilerplate that provides a good starting point for new applications. A few popular skeletons:

* `brunch new` — just initializes plain config and empty directories from [dead-simple](https://github.com/brunch/dead-simple).
* `brunch new -s es6` — Super-simple skeleton that does compilation of ECMAScript 6 files out-of-box
* `brunch new -s react` — Modern skeleton with React library.
* `brunch new -s exim` — An ultra-lightweight Flux-like architecture for HTML5 apps using Facebook's React library.
* `brunch new -s redux` — Redux: Predictable state container for React apps.
* `brunch new -s hipster` — Ready to Use Skeleton to build Desktop Applications with all the Web goodies of today.
* `brunch new -s chaplin` — Chaplin, Backbone, HTML5 Boilerplate, jQuery. Perfect for big applications
* `brunch new -s ember` — Twitter Bootstrap, jQuery

Check out other 50+ projects at [brunch.io/skeletons](http://brunch.io/skeletons)

## `brunch build` / `brunch b`

Builds a brunch project.

* `-e SETTING, --env SETTING` apply settings from `config.overrides[SETTING]`
* `-p, --production` would create optimized production build. Same as `-e production`

## `brunch watch` / `brunch w`

Watch brunch directory and rebuild if something changed. Options:

* all the same options available in `brunch build`, plus:
* `-s, --server`: run a simple http server that would serve `public` dir in `/` and `test` dir in `/test/`
* `-P PORT, --port PORT`: if a `server` option was specified, define on which port the server would run

Examples:

* `brunch w`: simply watch current directory &amp; compile the output to `public` directory.
* `brunch w -s`: watch current project and run a webserver that would work on public directory.
* `brunch w -sP 8841`: same as above, but run webserver on port 8841.
* `brunch w -e ios`: watch current directory &amp; compile the output using settings from `config.overrides.ios`

## Workers

Both `brunch build` and `brunch watch` allow you to supply a flag to enable *experimental* workers support for multi-process compilation. It may improve compilation speed of large projects with lots of CPU-bound compile and optimize operations on multi-core systems, but don't be surprised if the overhead involved actually slows down your compilation time.

To use it, pass the `-j` flag followed by a number of workers you want to spawn. Typically, this number should be no more than the number of cores on your machine. You can simply pass `-j` without a number to let Brunch figure out the number of cores.

(Mac users, be ware that on newer MacBooks that support hyperthreading, OS X will report twice the number of actual hardware cores, e.g. 4 instead of 2, so you are better off explicitly passing the number of workers.)

Experiment with the flag and the number of workers to see what configuration works best for your project *and* your machine.

## Tips

A few useful shortcuts for your shell environment, to type less and be more productive:

```
alias bb='brunch build'
alias bbp='brunch build --production'
alias bw='brunch watch'
alias bws='brunch watch --server'
```
