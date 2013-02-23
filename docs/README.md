# Brunch docs

Sections:

* [FAQ](./faq.md)
* [Commands](./commands.md)
* [Config](./config.md)
* [Plugins](./plugins.md)
* [Skeletons](./skeletons.md)
* [Upgrading](./upgrading.md)

## Getting started

Brunch concatenates all your scripts in `app/`, `test/` and `vendor/`
directories to **two** files by default:

* `app.js` contains your application code.
* `vendor.js` contains code of libraries you depend on (e.g. jQuery).

This is better solution for browser caching than using one file,
because you change dependencies not as often as you change
your application code.

Some files have special meaning:

* Files whose name start with `_` (underscore)
  are ignored by compiler. They're useful for languages like sass / stylus,
  where you import all substyles in main style file.
* Files in `assets/` dirs are copied directly to
  `public/`.

* Files in `vendor/` dirs aren't wrapped in modules.
  Module is a Common.JS / AMD abstraction that allows to simply
  get rid of global vars. For example, you have file `app/views/user_view` —
  you can load this in browser by using `require('views/user_view')`.
* Files named as `_test.<extension>` are considered as tests
  and are required automatically in test runner.

Order of concatenation is:

1. Files in `config.files[type].order.before` in order you specify.
2. Files in `vendor/` directories in alphabetic order.
3. All other files in alphabetic order.
4. Files in `config.files[type].order.after` in order you specify.

All this stuff (conventions, name of out files etc) can be changed
via modifying config file.
