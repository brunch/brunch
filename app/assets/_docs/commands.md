# Brunch: Commands

## `brunch new` / `brunch n`

Create new brunch project. Full syntax: `brunch new [path] [-s skeleton]`

* `path` (optional, default: `.`): name of project directory that would be created.
* `-s, --skeleton` (optional, default: `simple`): skeleton name or URL from [brunch.io/skeletons](http://brunch.io/skeletons)

Example:

* `brunch new`: The [default skeleton](#default-skeleton) does not add any libraries or frameworks
* `brunch new -s es6` would init a simple app that supports ECMAScript 6 compilation with Babel.
* `brunch new -s react` and `brunch new -s redux` are lovely skeletons for React fans.

You can specify environment variable `BRUNCH_INIT_SKELETON` for this command.

* `BRUNCH_INIT_SKELETON=es6 brunch new` do the same as `brunch new -s es6`

Firstly Brunch looks for the skeleton provided in command options, then for the env variable `BRUNCH_INIT_SKELETON` and if skeleton wasn't provided Brunch apply [default skeleton](#default-skeleton).

## `brunch build` / `brunch b`

Builds a brunch project and places the output into `public` directory.

* `-e, --env SETTING` apply settings from `config.overrides[SETTING]`
* `-p, --production` would create optimized production build. Same as `-e production`
* `-j, --jobs WORKERS` - enables *experimental* multi-process support.
May improve compilation speed of large projects.
Try different `WORKERS` amount to see which one works best for your system.
* `-d, --debug` - enables verbose debug output.

## `brunch watch` / `brunch w`

Watches brunch app directory for changes and rebuilds the whole project when they happen. Options:

* *all the same options* available in `brunch build`, plus:
* `-s, --server`: run a simple HTTP + pushstate server that would serve `public` dir in `/`
    * `-P PORT, --port PORT`: define on which port the server would run

## Default skeleton

* This is the best option for starting from scratch with Brunch.
* `brunch new` initializes new Brunch project already configured to start work.
* Clean folder structure, little and simple Brunch config and few default Brunch plugins.
* How to start and what skeleton includes you can see in it's [repo](https://github.com/brunch/dead-simple).
* More about default Brunch settings and behavior you can learn in [Conventions and defaults](https://github.com/brunch/brunch-guide/blob/master/content/en/chapter03-conventions-and-defaults.md) of Brunch [guide](https://github.com/brunch/brunch-guide).

There are more [other available skeletons](http://brunch.io/skeletons) with already preinstalled and configured stuff for different purposes.

## Tips

Install [`terminal-notifier`](https://github.com/alloy/terminal-notifier) (`brew install terminal-notifier` on Macs) to get system notifications for any build errors.

A few useful shortcuts for your shell environment, to type less and be more productive.
Add those to your `bashrc` or `zshrc`:

```
alias bb='brunch build'
alias bbp='brunch build --production'
alias bw='brunch watch'
alias bws='brunch watch --server'
```

If you need to understand in which environment Brunch was run, take a look in `process.env.NODE_ENV` variable. The content of this variable will be replaced with strings `'production'` or `'development'` during build time.
