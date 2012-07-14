*********
Skeletons
*********

Brunch skeleton is basically an application boilerplate that provides a good starting point for new applications. Creating new application with any skeleton is pretty simple: ``brunch new <app> --skeleton <address>``.

``<address>`` can be a:

* System directory (``~/skeletons/my-private-skel``)
* Git URL (``git://github.com/user/skel.git``)
* GitHub-sugared URL (``github://user/skel``)

Main parts of every skeleton:

* App path (usually `app/`): place for user's code should be.
* Vendor path (usually `vendor/`): place for 3rd party libs should be.
* Config (usually `config.coffee`): defines application configuration
* Test path (usually `test/`): place for tests.
* Generators path (`generators/`): place for scaffolders.
