Command line API
================

``brunch new <rootPath>``
-------------------------
Create new brunch project. Options:

* ``rootPath``: (required) name of project directory that would be created
* ``-o DIRECTORY, --output DIRECTORY```: build path
* ``-t PATH_TO_TEMPLATE --template PATH_TO_TEMPLATE``: path to project, contents of which will be copied to new .

Short-cut: ``brunch n``.

Examples:

* ``brunch new twitter -o twitter``: would create ``twitter/`` directory and create new brunch project there.
* ``brunch new twitter -t ~/brunch-templates/simple``

``brunch build``
----------------
Build a brunch project. Options:

* ``-o DIRECTORY, --output DIRECTORY``: build path

Short-cut: ``brunch b``.

Examples:

* ``brunch build -o .``: would build application and place results to current directory.

``brunch watch``
----------------
Watch brunch directory and rebuild if something changed. Options:

* ``-o DIRECTORY, --output DIRECTORY``: build path
* ``-s, --server``: run a simple http server that would server `output` dir
* ``-p PORT, --port PORT``: if a `server` option was specified, define on which port the server would run

Short-cut: ``brunch w``.

Examples:

* ``brunch watch``: simply watch current directory &amp; compile the output to `build` directory.
* ``brunch watch --output . --server``: watch current directory, compile the output to current directory and run a webserver that would work on current directory.
* ``brunch watch --output /tmp --server --port 8841``: watch current directory, compile the output to ``/tmp`` and run a webserver that would work on ``/tmp`` on port :8841.

``brunch generate <type> <name>``
---------------------------------
Generate model, view or route for current project. Options:

* ``type``: (required) generator type. One of: collection, model, router, style, template, view.
* ``name``: (required) generator class name / filename.
* ``-p PATH_TO_DIRECTORY --path PATH_TO_DIRECTORY``: path to directory in which file will be created. Useful if you prefer non-standard directory structure.

Short-cut: ``brunch g``.

Examples: 

* ``brunch generate collection user_list``: would generate file ``app/collections/user_list.coffee`` with class ``UserList`` and a unit-test ``test/unit/collections/user_list.coffee``.
* ``brunch g model post -p app/twitter/models``: would generate file ``app/twitter/models/post.coffee`` with class ``Post`` and a unit-test ``test/unit/twitter/models/post.coffee``.

``brunch destroy <type> <name>``
--------------------------------
Destroy model, view or route for current project, created by `brunch generate`. Options:

* ``type``: (required) generator type. One of: collection, model, router, style, template, view.
* ``name``: (required) generator class name / filename.
* ``-p PATH_TO_DIRECTORY --path PATH_TO_DIRECTORY``: path to directory in which file will be deleted. Useful if you prefer non-standard directory structure.

Short-cut: ``brunch d``.

Examples: 

* ``brunch destroy collection user_list``: would remove file ``app/collections/user_list.coffee`` with class ``UserList`` and a unit-test ``test/unit/collections/user_list.coffee``.
* ``brunch d model post -p app/twitter/models``: would remove file ``app/twitter/models/post.coffee`` with class ``Post`` and a unit-test ``test/unit/twitter/models/post.coffee``.
