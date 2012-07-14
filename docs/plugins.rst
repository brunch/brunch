*******
Plugins
*******

Brunch uses asynchronous node.js plugins to provide compilation / minification functional.

Usage
=====

Add "<plugin-npm-name>": "<plugin-version>" to package.json of your brunch app.

Pick a plugin version that corresponds to your minor (y) brunch version.

If you want to use git version of plugin, add "<plugin-npm-name>": "<git-repo>".

Examples:

.. code-block:: json

    "javascript-brunch": "1.3.5"
    "sass-brunch": "git+ssh://git@github.com:brunch/sass-brunch.git"

API
===

Brunch language is a CoffeeScript class that has ``brunchPlugin`` property. It would be initialized with application config (you can access it by using ``@config`` instance variable).

* ``brunchPlugin``: `(required, boolean)` it's always truthy for brunch plugins. By this field, brunch determines if current package is a real plugin or just random server-side thing.
* ``type``: `(required in compilers, minifiers & linters, string)`: type of source file. `javascript`, `stylesheet` or `template`.
* ``extension``: `(required in compilers & linters, string)`: all files with this extension will be filtered and passed to plugin.
* ``pattern``: `(optional in compilers & linters, regexp)`: sometimes just extension isn't enough. For example, Sass compiler needs to support both scss and sass extensions.
* ``lint(data, path, callback)``: `(optional, function)` would be called every time before compilation. If linter returns error to callback, compilation won't start.
* ``compile(data, path, callback)``: `(required in compilers, function)` would be called every time brunch sees change in application source code. Data is contents of source file which will be compiled, path is path to the file and callback is a function that will be executed on compilation with arguments ``error`` and ``result``.
* ``getDependencies(data, path, callback)``: `(required in compilers, function)` would be called every time brunch sees change in application source code. Used as chain compilation rule. For example, if `_user.styl` changes
and `main.styl` depends on it, `main.styl` will be recompiled too. To know this, brunch needs to receive an array of dependent files from the function.
* ``minify(data, path, callback)``: `(required in minifiers, function)` would be called every time brunch sees change in application source code. Data is contents of destination file which will be minified, path is path to the file and callback is a function that will be executed on compilation with arguments ``error`` and ``result``.
* ``onCompile(generatedFiles)``: `(optional, function)` would be called every time after brunch walks through the whole compilation circle. Could be useful if you make browser autoreload plugin etc.

Example:

``CSSCompiler`` would simply read the file and return its contents.

.. code-block:: coffeescript

    module.exports = class CSSCompiler
      brunchPlugin: yes
      type: 'stylesheet'
      extension: 'css'

      constructor: (@config) ->
        null

      compile: (data, path, callback) ->
        callback null, data

See `wiki page`_ for a list of plugins. Feel free to add new plugins there.

_`wiki page`: https://github.com/brunch/brunch/wiki/Plugins
