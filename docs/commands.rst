Command line API
================

brunch new
----------
Create new brunch project. Options:

* `project name`: (required) name of project directory that would be created
* `-o DIRECTORY, --output DIRECTORY`: build path

Examples:

* `brunch new twitter -o twitter`: would create `twitter/` directory and create new brunch project there.

brunch build
------------
Build a brunch project. Options:

* `-o DIRECTORY, --output DIRECTORY`: build path

Examples:

* `brunch build -o .`: would build application and place results to current directory.

brunch watch
------------
Watch brunch directory and rebuild if something changed. Options:

* `-o DIRECTORY, --output DIRECTORY`: build path
* `-s, --server`: run a simple http server that would server `output` dir
* `-p PORT, --port PORT`: if a `server` option was specified, define on which port the server would run

Examples:

* `brunch watch`: simply watch current directory &amp; compile the output to `build` directory.
* `brunch watch --output . --server`: watch current directory, compile the output to current directory and run a webserver that would work on current directory.
* `brunch watch --output /tmp --server --port 8841`: watch current directory, compile the output to `/tmp` and run a webserver that would work on `/tmp` on port :8841.

brunch generate
---------------
Generate model, view or route for current project. Options:

* `type`: (required) generator type. One of: collection, model, router, style, view.
* `name`: (required) generator class name / filename.

Examples: 

* `brunch generate collection user_list`: would generate file `app/collections/user_list.coffee` with class `UserList` and a unit-test `test/unit/collections/user_list.coffee`.
