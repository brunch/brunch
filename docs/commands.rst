Command line API
================

``brunch new <rootPath>``
-------------------------
Create new brunch project. Options:

* ``rootPath``: (required) name of project directory that would be created
* ``-s PATH_TO_SKELETON, --skeleton PATH_TO_SKELETON``: path or
git / github repo address of project, contents of which will be copied to new dir.

`.git` directory is automatically removed when copying.

Short-cut: ``brunch n``.

Examples:

* ``brunch n twitter -s ~/brunch-templates/simple``
* ``brunch n twitter -s github://paulmillr/brunch-with-chaplin-js``

``brunch build``
----------------
Build a brunch project. Options:

* ``-m, --minify``: minify the result js & css files? Analog of ``minify`` option in config file.
* ``-c CONFIG_PATH, --config CONFIG_PATH``: path to config (default: ``config``)
* ``-o PUBLIC_DIR, --public PUBLIC_DIR``: path to public directory (a place to which brunch would compile files)

Short-cut: ``brunch b``.

Examples:

* ``brunch b -c ios_config -m``: would load ios_config.(js,coffee), build application and minify the output.
* ``brunch b -m -o /home/www/site``: build application to ``/home/www/site`` and minify output.

``brunch watch``
----------------
Watch brunch directory and rebuild if something changed. Options:

* ``-s, --server``: run a simple http server that would server `output` dir in ``/`` and `test` dir in ``/test/``
* ``-p PORT, --port PORT``: if a `server` option was specified, define on which port the server would run
* ``-c CONFIG_PATH, --config CONFIG_PATH``: path to config (default: ``config``)
* ``-m, --minify``: minify the result js & css files? Analog of ``minify`` option in config file.
* ``-o PUBLIC_DIR, --public PUBLIC_DIR``: path to public directory (a place to which brunch would compile files)

Short-cut: ``brunch w``.

Examples:

* ``brunch w``: simply watch current directory &amp; compile the output to ``build`` directory.
* ``brunch w -s``: watch current project and run a webserver that would work on ``public`` directory (by default).
* ``brunch w -s -p 8841 -m -o /home/www/site``: watch current project, compile files in ``/home/www/site`` and run a webserver that would work on ``/home/www/site`` directory. Also, auto-minify files.

``brunch generate <type> <name>``
---------------------------------
Generate file for current project. Generator definitions are located in ``generators/`` directory of your project and you can make your own generator freely. Options:

* ``type``: (required) generator type.
* ``name``: (required) generator class name / filename.
* ``-p PATH_TO_DIRECTORY --path PATH_TO_DIRECTORY``: path to directory in which file will be created. Useful if you prefer non-standard directory structure.
* ``--plural FORM``: plural form of ``<name>``.

Short-cut: ``brunch g``.

Examples:

* ``brunch generate model user``: would do things, described in ``generators/model/generator.json``.

``brunch destroy <type> <name>``
--------------------------------
Destroy file for current project, created by `brunch generate`. Options:

* ``type``: (required) generator type.
* ``name``: (required) generator class name / filename.
* ``-p PATH_TO_DIRECTORY --path PATH_TO_DIRECTORY``: path to directory in which file will be deleted. Useful if you prefer non-standard directory structure.

Short-cut: ``brunch d``.

Examples:

* ``brunch generate model user``: would do things, described in ``generators/model/generator.json``.

``brunch test``
---------------
Run tests on the current project. Options:

* ``-c CONFIG_PATH, --config CONFIG_PATH``: path to config (default: ``config``)
* ``-f REGEX, --filter REGEX``: only run tests matched by this regex filter (e.g. ``brunch test -f ^integration/`` to run all tests in the directory ``test/integration/``)
* ``-r REPORTER, --reporter REPORTER``: mocha reporter name.

Short-cut: ``brunch t``.
