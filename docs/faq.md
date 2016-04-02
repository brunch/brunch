# Brunch: FAQ

[**Getting started**](./README.md) | [**Commands**](./commands.md) | [**Config**](./config.md) | [**Plugins**](./plugins.md) | **FAQ**

- [How to use NPM as client-side package manager?](#how-to-use-npm-as-client-side-package-manager)
- [How to use Bower?](#how-to-use-bower)
- [I want to create a separate JavaScript output. What's the best way?](#jointo)
- [Uninstalling and installing plugins](#uninstalling-and-installing-plugins)
- [I get an EMFILE error when I build a Brunch project](#emfile)
- [How can Brunch help with testing?](#how-can-brunch-help-with-testing)

## How to use NPM as client-side package manager?

Brunch supports handling client-side dependencies using the [NPM](https://npmjs.com) package manager.

NPM integration is enabled by default starting Brunch 2.3 so there's no additional setup!
Simply `npm install --save` your front-end packages as you normally would, `require` them in your app, and Brunch will figure out the rest.

Just make sure that your don't forget to join `/^node_modules/` somewhere!

```coffeescript
files:
  javascripts:
    joinTo:
      'js/app.js': /^app/
      'js/vendor.js': /^node_modules/
```

Brunch can also handle styles of client-side libraries, but by providing `styles` attribute which is key-value object where key is package name and value is an array with relative to package path of styles which should be included.

```coffeescript
npm:
  styles:
    leaflet: [ 'dist/leaflet.css' ]
files:
  javascripts:
    joinTo:
      'js/vendor.js': /^node_modules/
  styles:
    joinTo:
      'css/vendor.css': /^node_modules/
```

## Does Brunch support Hot Module Replacement?

Yes it does! Check out the [`hmr-brunch`](https://github.com/brunch/hmr-brunch) plugin for more details.

## How to use Bower?

Brunch does support [Bower](http://bower.io), however NPM is becoming de-facto standard for front-end packages.
You may still want/need to use bower for some of your packages that aren't on NPM yet, or just copy these to `vendor`.

For more details on NPM integration, see the next section.

To add packages to your project:

* Make sure you have `bower.json`, which can be generated with `bower init`
* Add packages to the `dependencies` field of your `bower.json`
* Optionally specify the [`overrides` property](https://github.com/paulmillr/read-components#read-components) for packages without `bower.json`. This is needed because brunch automatically compiles bower dependencies in right order.
* Note that `overrides` do not impact Bower's behavior, so the original dependency graph will still be copied by `bower install`. But specifying `overrides` is effective for changing the dependencies that actually get built into your project.

As for now, you can solve it in different ways - by using `npm post-install` script, `onCompile` handler in config `hooks` etc.

```json
"scripts": {
  "postinstall": "brunch b && cp -r node_modules/font-awesome/fonts public/fonts"
}
```

You can override some dependent package manifest using `overrides` attribute in `package.json` / `bower.json`.

Be aware, that `main` attribute in `package.json` is a string, but array in `bower.json`.

```json
"dependencies": {
    "some-awesome-package": "~0.0.1"
},
"overrides": {
    "some-awesome-package": {
        "main": "./lib/just_one_component.js"
    }
}
```

<a name="jointo"></a>
## I want to create a separate JavaScript output. What's the best way?

Sometimes it's useful to create separate JS files for bookmarklets etc. Use this joinTo config. It will compile all files in `app/` (except in `app/namespace`) to one file and all files in `app/namespace` to another.

```coffeescript
joinTo:
  'javascripts/namespace.js': /^app(\/|\\)namespace/
  'javascripts/app.js': /^app(\/|\\)(?!namespace)/
  'javascripts/vendor.js': /^vendor/
```

## Uninstalling and installing plugins

For example, you want to change default `Handlebars` templates to `eco`.

* Remove the `"handlebars-brunch"` line from `package.json`.
* Install eco-brunch: `npm install eco-brunch --save`.

<a name="emfile"></a>
## I get an EMFILE error when I build a Brunch project

`EMFILE` means there are too many open files.
Brunch watches all your project files and it's usually a pretty big number.
You can fix this error with setting max opened file count to a bigger number
using the command `ulimit -n <number>` (10000 should be enough).

## How can Brunch help with testing?

This simple function will load all your files that are ending with `-test` suffix (`user-view-test.coffee` etc).

```javascript
window.require.list()
  .filter(function(name) {return /-test$/.test(name);})
  .forEach(require);
```
