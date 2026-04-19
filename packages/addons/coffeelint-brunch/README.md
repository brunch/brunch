## coffeelint-brunch
Adds [coffeelint](http://www.coffeelint.org) support to
[brunch](http://brunch.io).

## Usage <a name="usage" href="#usage" title="Link to this section">⚑</a>
Install the plugin via npm with `npm install --save-dev coffeelint-brunch`.

Or, do manual install:

* Add `"coffeelint-brunch": "x.y.z"` to `package.json` of your brunch app.
  Pick a plugin version that corresponds to your minor (y) brunch version.
* If you want to use git version of plugin, add
`"coffeelint-brunch": "git+ssh://git@github.com:ilkosta/coffeelint-brunch.git"`.

By default, only files in your `config.paths.app` are linted.

You can customize coffeelint config by changing brunch config using the native [coffeelint options](http://www.coffeelint.org/#options):

```coffeescript
config =
  plugins:
    coffeelint:
      pattern: /^app\/.*\.coffee$/
      options:
        no_trailing_semicolons:
          level: "ignore"
```

You can also use the standard `coffeelint.json` file instead of adding exceptions in the brunch config:

```coffeescript
config =
  plugins:
    coffeelint:
      useCoffeelintJson: yes
```

In the second case, any rules in `plugins.coffeelint.options` are ignored and instead coffeelint is supplied with the contents of the `coffeelint.json` file found in the root directory as the configuration object.

Every sub-option (`pattern`, `options`, `useCoffeelintJson`, `globals`) is optional.

## License <a name="license" href="#license" title="Link to this section">⚑</a>
Copyright (c) 2012 "ilkosta" Costantino Giuliodori.

Licensed under the [MIT license](coffeelint-brunch/blob/master/LICENSE-MIT).
