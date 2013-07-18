# Command line API

## `brunch new`

Full syntax: `brunch new <url-or-path> [rootPath]`

Create new brunch project. Options:

* `url-or-path`: (required) skeleton (path or
git / github repo address of project), contents of which will be copied to new dir.
* `rootPath`: name of project directory that would be created. Default: '.'.

`.git` directory is automatically removed when copying.

Brunch skeleton is basically an application boilerplate that provides a good starting point for new applications. Creating new application with any skeleton is pretty simple: `brunch new <app> --skeleton <address>`.

`<address>` can be a:

* System directory (`~/skeletons/my-private-skel`)
* Git URL (`git://github.com/user/skel.git`)
* GitHub-sugared URL (`gh:user/skel`, `github:user/skel`)

Each skeleton must have `config.(js,coffee)`.

Short-cut: `brunch n`.

Examples:

* `brunch n ~/brunch-templates/simple`
* `brunch n gh:paulmillr/brunch-with-chaplin twitter`

## `brunch build`

Build a brunch project. Options:

* `-o, --optimize`: build an optimized version of application. Minifies result js & css files and does other stuff.
* `-c CONFIG_PATH, --config CONFIG_PATH`: path to config (default: `config`)

Short-cut: `brunch b`.

Examples:

* `brunch b -c ios_config -o`: would load ios_config.(js,coffee), build application and optimize the output.

## `brunch watch`

Watch brunch directory and rebuild if something changed. Options:

* `-s, --server`: run a simple http server that would server `output` dir in `/` and `test` dir in `/test/`
* `-p PORT, --port PORT`: if a `server` option was specified, define on which port the server would run
* `-c CONFIG_PATH, --config CONFIG_PATH`: path to config (default: `config`)
* `-o, --optimize`: build an optimized version of application. Minifies result js & css files and does other stuff.

Short-cut: `brunch w`.

Examples:

* `brunch w`: simply watch current directory &amp; compile the output to `public` directory.
* `brunch w -s`: watch current project and run a webserver that would work on public directory.
* `brunch w -sop 8841`: watch current project, compile files with optimizations and run a webserver that would work on public directory.
