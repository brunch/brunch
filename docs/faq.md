# FAQ

## I want to start new project with Brunch. What's the workflow?

* Create a new project with `brunch new <skeleton>`. See available skeletons [here](http://brunch.io/skeletons).
* Create static HTML pages in `app/assets` directory (`login.html`, `user.html` etc.) and corresponding styles in `app/styles`.
* If you need any app-specific scripts in the browser make sure they are loaded in your html via the `require('')` function. See the [Brunch conventions](https://github.com/brunch/brunch/tree/stable/docs#conventions).
* Watch application files with `brunch watch --server` and see the results in browser on `localhost:3333`. Auto-debug in browser with `auto-reload-brunch` (`npm install --save auto-reload-brunch`) which will automatically re-apply styles or reload the page when changes are saved.
* When all mockups are done, create app classes for them with `scaffolt` ([scaffolt package](https://github.com/paulmillr/scaffolt)). E.g. `scaffolt view user` (you need to have `generators` directory in your app).
* Debug your code in browser via `console.log` or `debugger` statements.

## How to use Bower?

Brunch does support [Bower](http://bower.io), however NPM is becoming de-facto standard for front-end packages.
You may still want/need to use bower for some of your packages that aren't on NPM yet, or just copy these to `vendor`.

For more details on NPM integration, see the next section.

To add packages to your project:

* Make sure you have `bower.json`, which can be generated with `bower init`
* Add packages to the `dependencies` field of your `bower.json`
* Optionally specify the [`overrides` property](https://github.com/paulmillr/read-components#read-components) for packages without `bower.json`. This is needed because brunch automatically compiles bower dependencies in right order.
* Note that `overrides` do not impact Bower's behavior, so the original dependency graph will still be copied by `bower install`. But specifying `overrides` is effective for changing the dependencies that actually get built into your project.

Example app with Bower integration: http://github.com/paulmillr/ostio

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

## How to handle other package assets?

We're [working](https://github.com/brunch/brunch/issues/633) on it. As for now, you can solve it in different ways - by using `npm post-install` script, `onCompile` handler in config etc.

```json
"scripts": {
  "postinstall": "brunch b && cp -r node_modules/font-awesome/fonts public/fonts"
}
```

## How to override package manifest?

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

## I want to create a separate JavaScript file (for a bookmarklet, etc.). What's the best way?

Use this joinTo config. It will compile all files in `app/` (except in `app/namespace`) to one file and all files in `app/namespace` to another.

```coffeescript
joinTo:
  'javascripts/namespace.js': /^app(\/|\\)namespace/
  'javascripts/app.js': /^app(\/|\\)(?!namespace)/
  'javascripts/vendor.js': /^vendor/
```

## How do I uninstall an old plugin and install a new one?

For example, you want to change default `Handlebars` templates to `eco`.

* Remove the `"handlebars-brunch": "version"` line from `package.json`.
* Install eco-brunch: `npm install eco-brunch --save`.

## I get an EMFILE error when I build a Brunch project. WTF?

`EMFILE` means there are too many open files.
Brunch watches all your project files and it's usually a pretty big number.
You can fix this error with setting max opened file count to a bigger number
using the command `ulimit -n <number>` (10000 should be enough).

## How do I enable verbose mode for brunch commands?

*TL;DR*: Add a DEBUG environment variable, e.g. `DEBUG='brunch:*'`.
Then, when you run `brunch watch`, you'll see debug output.

Output can be filtered to particular parts of Brunch's internal workflow by modifying the command to something like `DEBUG='brunch:pipeline'`.

This is useful for explicitly seeing the list of source files that are compiled into each output file (as well as their order).

### Linux/OS X:

Use the `--debug` (`-d`) option in front of your `brunch` command for on-demand use, such as `brunch build -d`

### Windows:

Add a System Environment variable via `Control Panel > System > Advanced System Settings (Advanced Tab) > Environment Variables`:
![Windows System Environment Variable](./windows.png?raw=true)

## I get an error like "MODULE_NOT_FOUND" when I try to run Brunch

You need to install brunch plugins. It can be done simply by executing `npm install` in your project directory.

## What languages do you recommend I use?

* `CoffeeScript` is used because it plays nice with object-oriented Backbone.js nature.
* `Stylus` is used because a) it has customizable syntax (you can use or drop braces / semicolons / colons), unlike less / sass; b) its mixins are transparent. If you're writing `border-radius` in stylus with `nib`, it's automatically expanded to all needed vendor prefixes. No need to use `LESS` / `SCSS` syntax. Example: https://gist.github.com/2005644.
* `Handlebars` templates are used because they are logic-less, compatible with Mustache (which has implementations in many languages), and have a nice helpers system. If you're a fan of clear terse syntax, you might like `Jade` instead, which is similar to, but much clearer than `HAML`.

## What is the recommended way of running tests?

This simple function will load all your files that are ending with `-test` suffix (`user-view-test.coffee` etc).

```javascript
window.require.list()
  .filter(function(name) {return /-test$/.test(name);})
  .forEach(require);
```
