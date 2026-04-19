# nunjucks-brunch [![Build status](https://img.shields.io/travis/brunch/nunjucks-brunch.svg)](https://travis-ci.org/brunch/nunjucks-brunch) [![Latest version](https://img.shields.io/npm/v/nunjucks-brunch.svg)](https://www.npmjs.com/package/nunjucks-brunch) [![Test coverage](https://img.shields.io/codeclimate/coverage/github/PxlBuzzard/nunjucks-brunch.svg)](https://codeclimate.com/github/PxlBuzzard/nunjucks-brunch)

Adds [Nunjucks](https://mozilla.github.io/nunjucks/) support to [Brunch](http://brunch.io).

## Usage

* Install the plugin via npm with `npm install --save-dev nunjucks-brunch`.
* If you want to use git version of plugin: `npm install --save-dev brunch/nunjucks-brunch`.

### Brunch plugin settings

If customization is needed or desired, settings can be modified in your brunch
config file (such as `config.coffee`):

* __templatePath__: Default `app/views`. The top-level directory where your nunjucks templates are stored.  __Note:__ Windows users will want to use `app\\views`.

* __pathReplace__: _(RegExp)_ Default `/^app(\/|\\)views(\/|\\).*.html$/`. Sets the regular expression applied against the source file path to create the module name. Matched characters are removed.

* __Custom Variables__: Any variable you define can be referenced in a nunjucks template. For example, `{{ github_username }}` would output to `PxlBuzzard` using the example below.

**Example:**
```coffeescript
exports.config =
  ...
  plugins:
    nunjucks:
      github_username: 'PxlBuzzard'
```

## Gratitude

Thanks [Daniel Jost](https://github.com/PxlBuzzard) for creating and maintaining first versions of the plugin.
