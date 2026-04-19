# Brunch: Using JS modules and NPM

<div class="toc-placeholder"></div>

## Intro

Organizing your JS code by modules is a central idea in Brunch.
It allows your files to each have a separate scope, and also execute only when needed.

A file's name is also its module name.
To make things a bit nicer, Brunch cuts the `app` portion from the module name.
For example, `app/config.js` will have a module name of `config.js`.
With CommonJS, your modules will return values by putting them into `module.exports`, just like you would with Node.

```js
// app/config.js
module.exports = {
  api: {
    host: 'brunch.io'
  }
};
```

To use it in other modules, just `require` it! Note that you can require using both a name with extension (like `config.js`) or a name without extension (`config`):

```js
const config = require('config');

makeRequest(config.api, 'GET', 'plugins');
```

Your application should have an entry point module which will load other modules and bootstrap your app.
When the HTML loads in the browser, you need to tell it to load your entry module.
You can do it by either:

* adding `<script>require('initialize');</script>` — where `initialize` is the name of the entry module (which would be located in `app/initialize.js`); **OR**
* adding an [`autoRequire`](/docs/config#-modules-) to config, to make Brunch do the above for you:

  ```js
  // brunch-config
  module.exports = {
    modules: {
      autoRequire: {
        // outputFileName : [ entryModule ]
        'javascripts/app.js': ['initialize']
      }
   }
  };
  ```

## Kinds of modules

Brunch supports several JS module styles:

* CommonJS (default)
* AMD
* Custom wrapper & definition

You can use either of these in your projects, however CommonJS is becoming the universal standard, and certain Brunch features, namely the NPM integration, only work with CommonJS.
Additionally, most of the docs will assume you use CommonJS.

## NPM integration

Brunch supports handling client-side dependencies using the [NPM](https://npmjs.com) package manager.

### Using node modules

NPM integration is enabled by default starting Brunch 2.3 so there's no additional setup!
Simply `npm install --save` your front-end packages as you normally would, `require` them in your app, and Brunch will figure out the rest.

Just make sure that you don't forget to join `/^node_modules/` somewhere!

```js
files: {
  javascripts: {
    joinTo: {
      'js/app.js': /^app/,
      'js/vendor.js': /^(?!app)/ // We could also use /node_modules/ regex.
    }
  }
}
```

### Compiling NPM dependencies

Brunch can also handle compiling client-side libraries, by providing the `compilers` attribute which is an array of strings, listing which plugins should be used to process dependencies. Take care that (for plug-ins that are set to compile common file extensions like .js) that the plugin configuration ignores packages that should not be compiled.

```js
npm: {
  //allow to transpile ES6 NPM dependencies
  compilers: ['babel-brunch'],      
},
plugins: {
  //babel transpiler options
  babel: {
    //skip external libraries, except those we wish to compile
    ignore: [/^node_modules\/(?!LIB_TO_COMPILER)/]
  }
}
```

### Including modules' styles

Brunch can also handle styles of client-side libraries, by providing `styles` attribute which is key-value object where key is package name and value is an array with relative to package path of styles which should be included.

```js
npm: {
  styles: {
    leaflet: ['dist/leaflet.css']
  }
},
files: {
  javascripts: {
    joinTo: {'js/vendor.js': /^node_modules/}
  },
  stylesheets: {
    joinTo: {'css/vendor.css': /^node_modules/}
  }
}
```

Note that for other assets that come from NPM packages (like images, fonts, etc), you will have to manually copy them to your public folder. You can use the npm's `postinstall` hook to do the copying. See [FAQ](/docs/faq).

### Making packages global

It's possible to expose npm packages to `window` — so that you can access the module without requiring it. See [docs](/docs/config#-npm-).

## Hot Module Replacement

Brunch also supports Hot Module Replacement with the [`hmr-brunch`](http://github.com/brunch/hmr-brunch) plugin. Refer to its README for more details.

## Using Bower

Brunch does support [Bower](http://bower.io), however NPM is becoming de-facto standard for front-end packages.
You may still want/need to use bower for some of your packages that aren't on NPM yet, or just copy these to `vendor`.

For more details on NPM integration, see the previous section.

To add packages to your project:

* Make sure you have `bower.json`, which can be generated with `bower init`
* Add packages to the `dependencies` field of your `bower.json`
* Optionally specify the [`overrides` property](https://github.com/paulmillr/read-components#read-components) for packages without `bower.json`. This is needed because brunch automatically compiles bower dependencies in right order.
* Note that `overrides` do not impact Bower's behavior, so the original dependency graph will still be copied by `bower install`. But specifying `overrides` is effective for changing the dependencies that actually get built into your project.

As for now, you can solve it in different ways - by using `npm post-install` script, `onCompile` handler in config `hooks` etc.

```json
"scripts": {
  "postinstall": "cp -r node_modules/font-awesome/fonts public/fonts"
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
