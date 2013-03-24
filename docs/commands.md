# Command line API

## `brunch new`

Full syntax: `brunch new <rootPath>`

Create new brunch project. Options:

* `rootPath`: (required) name of project directory that would be created
* `-s PATH_TO_SKELETON, --skeleton PATH_TO_SKELETON`: path or
git / github repo address of project, contents of which will be copied to new dir.

`.git` directory is automatically removed when copying.

Short-cut: `brunch n`.

Examples:

* `brunch n twitter -s ~/brunch-templates/simple`
* `brunch n twitter -s github://paulmillr/brunch-with-chaplin-js`

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
* `brunch w -s -p 8841 -o`: watch current project, compile files with optimizations and run a webserver that would work on public directory.
