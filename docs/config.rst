******************
Configuration file
******************

Brunch uses configuration file (``config.coffee`` or ``config.js``) located in the root directory to control various aspects of your application.

``paths``
=============

`Optional, object`: ``paths`` contains application paths to key directories. Paths are simple strings.

* ``public`` key: path to build directory that would contain output.
* Other valid keys: ``assets``, ``test``, ``app``, ``vendor``, ``root``.

Example:

::

    paths:
      public: '../deploy'
      assets: '../../static'
      test: 'spec'

``files``
=========

`Required, object`: ``files`` configures handling of application files: which compiler would be used on which file, what name should output file have etc. 

* <type>: ``javascripts``, ``stylesheets`` or ``templates``
    * defaultExtension: (optional). Defines what file will be generated with `brunch generate`.
    * joinTo: (required) describes how files will be compiled & joined together. Available formats:
        * 'outputFilePath'
        * map of ('outputFilePath': /regExp that matches input path/)
        * map of ('outputFilePath': function that takes input path)
    * order: (optional) defines compilation order. ``vendor`` files will be compiled before other ones even if they are not present here.
        * before: list of files that will be loaded before other files
        * after: list of files that will be loaded after other files

.. note::

    all files from ``vendor`` directory are automatically (by-default) loaded before all files from ``app`` directory. So, ``vendor/scripts/jquery.js`` would be loaded before ``app/script.js`` even if order config is empty.

Example:

::

    files:
      javascripts:
        defaultExtension: 'coffee'
        joinTo:
          'javascripts/app.js': /^app/
          'javascripts/vendor.js': /^vendor/
        order:
          before: [
            'vendor/scripts/console-helper.js',
            'vendor/scripts/jquery-1.7.js',
            'vendor/scripts/underscore-1.3.1.js',
            'vendor/scripts/backbone-0.9.0.js'
          ]

      stylesheets:
        defaultExtension: 'styl'
        joinTo: 'stylesheets/app.css'
        order:
          before: ['vendor/styles/normalize.css']
          after: ['vendor/styles/helpers.css']

      templates:
        defaultExtension: 'eco'
        joinTo: 'javascripts/app.js'

``framework``
=============

`Optional, string`: framework you'll be using as skeleton of your app.

Default value is ``'backbone'``.

Examples: ``'backbone'``, ``'ember'``, ``'batman'``.

``minify``
==========

`Optional, boolean`: determines if minifiers should be enabled or not.

Default value is ``false``.

Examples: ``true``, ``false``.

``server``
==========

`Optional, object`: contains params of webserver that runs on ``brunch watch --server``.

* ``path``: (optional) path to nodejs file that will be loaded. The file must contain ``exports.runServer`` function.
* ``port``: (optional) port on which server will run
* ``run``: should the server be launched with ``brunch watch``?

Example:

::

    server:
      path: 'server.coffee'
      port: 6832
      run: yes
