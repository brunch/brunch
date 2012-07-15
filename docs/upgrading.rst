****************
Upgrading brunch
****************

Upgrading to 1.4
================
* Remove all ``config.files[lang].defaultExtension`` settings.
* Remove ``config.framework`` setting.
* Move ``config.paths.ignored`` to ``config.conventions.ignored`` if you have it.
* (If you want to use ``brunch generate``) Add ``generatorRelations`` setting. Example: https://github.com/paulmillr/brunch-with-chaplin/blob/master/config.coffee. Add ``generators`` directory with generators. Example: https://github.com/paulmillr/brunch-with-chaplin/blob/master/generators/
* Update ``package.json`` brunch plugins versions to ``>= 1.0 < 1.5``
* Run ``npm install``

Upgrading to 1.3
================

* Add test files joinTo configuration to your config file. You can look at https://github.com/paulmillr/brunch-with-chaplin/blob/master/config.coffee as an example.
* Add test files as in example https://github.com/paulmillr/brunch-with-chaplin/tree/master/test
* Update ``package.json`` brunch plugins versions to ``>= 1.0 < 1.4``
* Run ``npm install``

Upgrading to 1.2
================

* Update ``package.json`` brunch plugins versions to ``>= 1.0 < 1.3``
* Run ``npm install``

Upgrading to 1.1
================

* Change ``buildPath: ...`` in ``config.coffee`` to ``paths: public: ...``
* Update ``package.json`` brunch plugins versions to ``>= 1.0 < 1.2``
* Run ``npm install``

Upgrading to 1.0
================

* Edit config:
    * Remove ``plugins`` section, as it has been moved to ``package.json``.
    * Remove ``defaultExtensions`` section.
    * Edit ``files`` section to conform to new config API.
* Remove ``node_modules/`` directory. Install plugins you need by editing ``package.json`` and executing ``npm install`` after it.
    
* Upgrade backbone & jquery to latest versions (optional).

Upgrading to 0.9
================

* Move ``src/app`` to ``app`` and ``src/vendor`` to ``vendor/scripts``
* Move all files that you were putting to ``build`` directory out of there, to ``app/assets``. ``build`` is now generated automatically. Create ``app/assets`` if it doesn't exist.
* Upgrade ``vendor/scripts/backbone-0.5.2.js`` to ``vendor/scripts/backbone-0.5.3.js`` and ``vendor/scripts/jquery-1.6.2.js`` to ``vendor/scripts/jquery-1.7.js``.
* Rename ``vendor/scripts/ConsoleDummy.js`` to ``vendor/scripts/console-helper.js``.
* Create ``package.json`` and ``config.coffee``. You can copy them from new brunch application (``brunch new app && cp app/package.json app/config.coffee && rm -rf app``). Though, ``config.coffee`` would require some editing if you've edited ``config.yaml`` previously.
* Execute ``npm install``.

Upgrading to 0.8
================

* Update Vendor. First of all you need upgrade files from brunch/src/vendor:

  * backbone-master.js -> backbone-0.5.2.js
  * ConsoleDummy.js
  * jquery-1.5.2.js -> jquery-1.6.2.js
  * underscore-1.1.5.js -> underscore-1.1.7.js

* Upgrade to Backbone 0.5.0+: rename Controllers to Routers, refresh to reset and call navigate instead of saveLocation and setLocation. For more details please visit http://documentcloud.github.com/backbone/#Upgrading


Upgrading to 0.7
================

Since 0.7.0 brunch uses stitch which comes with a CommonJS modules
implementation. Therefore developers have to require modules and export
variables and functions explicitly. See an upgrade example here:
https://github.com/brunch/example-todos/commit/c57ec1a418b8dcf694185b03a254199217972652

* Update Vendor: remove brunch-0.x.js file from brunch/src/vendor and instead add these files:

  * backbone-master.js
  * ConsoleDummy.js
  * jquery-1.5.2.js
  * underscore-1.1.5.js

You can find them by creating a new brunch app in src/vendor.

* Add a config.yaml clone from a new brunch app to brunch/config.yaml
* Update index.html
* Replace all your 'script' tags with

  .. code-block:: html

      <script src="web/js/app.js"></script>
      <script>require('main');</script>

* You need to explicitly export everything that needs to be visible in another file. For example a Todo Model should change from

  .. code-block:: coffeescript

    class Todo extends Backbone.Model


to

  .. code-block:: coffeescript

    class exports.Todo extends Backbone.Model


* If you want to use any object or function from another module you need to require it. For example if the Todo model is used in Todos collection you need to add this piece of code to todos_collection.coffee.

  .. code-block:: coffeescript

    {Todo} = require 'models/todo'

* Stitch also compiles templates. So you have to require them as well.

  .. code-block:: coffeescript

    homeTemplate = require 'templates/home'

    class exports.HomeView extends Backbone.View
      render: ->
        @$(@el).html homeTemplate()

* Cleanup Directory Structure: remove these legacy files/directories

  * brunch/build/web/js/concatenation.js
  * brunch/build/web/js/templates.js
  * brunch/build/web/js/vendor/
  * brunch/config/
  * docs/ (keep it in case you still want to use docco manually)
