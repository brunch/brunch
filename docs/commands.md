# Command line API

## `brunch new`

Full syntax: `brunch new [path] [-s skeleton]`

Create new brunch project. Options:

* `path`: name of project directory that would be created. Default: '.'.
* `skeleton`: (optional) skeleton (name or git URL), contents of which will be copied to new dir.

`.git` directory is automatically removed when copying.

Brunch skeleton is basically an application boilerplate that provides a good starting point for new applications. A few popular skeletons:

* `brunch new -s simple` — if you want no opinions. Just initializes configs and empty directories
* `brunch new -s react` — React + React Router + Stylus + ES6 / JSX
* `brunch new -s hipster` — Angular, Bootstrap, node-webkit, CoffeeScript + Less + Jade
* `brunch new -s chaplin` — Backbone, Chaplin, CoffeeScript. One of the most popular skeletons

Each skeleton must have `brunch-config.(js,coffee)` file.

Short-cut: `brunch n`.

Examples:

* `brunch new -s simple`
* `brunch new -s https://github.com/brunch/dead-simple`

## `brunch build`

Build a brunch project. Options:

* `-e SETTING, --env SETTING`: apply settings from `config.overrides[SETTING]`
* `-P, --production`: run optimize/minify plugins during compilation, disable source maps and auto-reload; same as `-e production` and settings can be modified in `config.overrides.production`

Short-cut: `brunch b`.

Examples:

* `brunch b -P`: would create optimized/production build.
* `brunch b -e ios`: build using the settings from `config.overrides.ios`

## `brunch watch`

Watch brunch directory and rebuild if something changed. Options:

* all the same options available in `brunch build`, plus:
* `-s, --server`: run a simple http server that would serve `public` dir in `/` and `test` dir in `/test/`
* `-p PORT, --port PORT`: if a `server` option was specified, define on which port the server would run

Short-cut: `brunch w`.

Examples:

* `brunch w`: simply watch current directory &amp; compile the output to `public` directory.
* `brunch w -s`: watch current project and run a webserver that would work on public directory.
* `brunch w -sp 8841`: same as above, but run webserver on port 8841.
* `brunch w -e ios`: watch current directory &amp; compile the output using settings from `config.overrides.ios`
