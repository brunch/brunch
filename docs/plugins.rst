*********************
Languages and plugins
*********************

Languages
=========

Brunch language is a CoffeeScript class that has asynchronous ``compile`` method. It would be initialized with application config (you can access it by using ``@config`` instance variable). Its ``compile(path, callback)`` would be called every time brunch **sees change in application source code**. Here's some example languages:

``FooLanguage`` would simply read the file and return its contents.

.. code-block:: coffeescript

    fs = require 'fs'

    class exports.FooLanguage
      constructor: (@config) ->
      compile: (path, callback) ->
        fs.readFile path, (error, data) ->
          callback error, data.toString()

It is recommended to have async queue for file reading, like the one in ``BarLanguage``:

.. code-block:: coffeescript

    fs = require 'fs'
    async = require 'async'
    # Make sure you include 'async' module to your deps.

    class exports.BarLanguage
      # Limit a number of files read at same time to 5.
      queue: async.queue fs.readFile, 5

      constructor: (@config) ->

      readFile: (file, callback) ->
        @queue.push file, (error, data) ->
          callback error, data.toString()

      compile: (file, callback) ->
        @readFile file, callback

Default languages
-----------------

Brunch has a bunch of languages, included by-default.

List of languages that compile to .js:

* ``'\\.coffee$': languages.CoffeeScriptLanguage``: basic support for coffeescript_ files
* ``'\\.eco$': languages.EcoLanguage``: eco_ -- ERB-like coffeescript-based templates
* ``'\\.mustache$': languages.HoganLanguage``: hogan_ -- mustache-compatible templates by Twitter folks
* ``'\\.jade$': languages.JadeLanguage``: Jade_ -- elegant HAML-like template language
* ``'\\.js$': languages.JavaScriptLanguage``: basic support for javascript files
* ``'\\.roy$': languages.RoyLanguage``: Roy_, functional language, that compiles to js

List of languages that compile to .css:

* ``'\\.css$': languages.CSSLanguage``: basic support for css files
* ``'\\.styl$': languages.StylusLanguage``: stylus_ is a robust language that supports Sass syntax. Also includes nib_, a small and powerful library, providing robust cross-browser CSS3 mixins
* ``'\\.less$': languages.LESSLanguage``: basic support for LESS_
* ``'\\.s[ac]ss$': languages.SASSLanguage``: basic support for Sass_, a ruby-based style language

Plugins
=======

Brunch plugin is a CoffeeScript class that has asynchronous ``load`` method. It would be initialized with application config (you can access it by using ``@config`` instance variable). Its ``load(files, callback)`` would be called every time brunch **is ready to write data to output files**. It's worth noting that you **must** return ``files`` in callback, because ``files`` could have been transformed. File transformation is used in `minify plugin`_. Here's example plugin:

``FooPlugin`` does nothing.

.. code-block:: coffeescript

    class exports.FooPlugin
      constructor: (@config) ->

      load: (files, callback) ->
        callback null, files


Default plugins
---------------

List of plugins included by-default:

* ``plugins.AssetsPlugin``: copy ``app/assets`` contents to ``build/``
* ``plugins.MinifyPlugin``: minifies all CSS & JS files

.. _CoffeeScript: http://coffeescript.org/
.. _eco: https://github.com/sstephenson/eco
.. _Hogan: http://twitter.github.com/hogan.js/
.. _Jade: http://visionmedia.github.com/jade/
.. _Roy: http://roy.brianmckenna.org/
.. _Swig: http://paularmstrong.github.com/swig/

.. _stylus: http://learnboost.github.com/stylus/
.. _nib: http://visionmedia.github.com/nib/
.. _LESS: http://lesscss.org/
.. _Sass: http://sass-lang.com/

.. _minify plugin: https://github.com/brunch/brunch-extensions/blob/master/src/plugins/minify.coffee
