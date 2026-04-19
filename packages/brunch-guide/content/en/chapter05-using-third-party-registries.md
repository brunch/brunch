# Using third-party module registries

This is part of [The Brunch.io Guide](../../README.md).

In practice, the nicer way to deal with third-party dependencies is through **existing module registries**.  In the JS world, this mostly means **[npm](https://www.npmjs.com/)** (for Node.js and for front-end code; it recently became the official registry for jQuery plugins!) or [Bower](http://bower.io/) (which, IMHO, is on the way out, with npm slowly replacing it).

The big benefit of formal dependency management is that you get to express **flexible version dependencies**, easing the installation and **upgrade** of your dependencies.

The great thing is, Brunch supports both NPM and Bower out of the box. Given that Bower is being in fact replaced by NPM, you probably shouldn't use it until you really have to.

We could have used that for jQuery, for instance.  We can then install jQuery like so:

```sh
$ npm install --save jquery
```

This command looks up the NPM registry for the latest jQuery version, installs it in the proper local directory, and updates `package.json` to reflect the newly installed component.

We then can strip `jquery.js` from our `app`.  In order to retain the split targets we had in the previous chapter, we need to adjust our `brunch-config.js` so regexes match the new file layout:

```js
module.exports = {
  files: {
    javascripts: {
      joinTo: {
        'libraries.js': /^(?!app\/)/,
        'app.js': /^app\//
      }
    },
    stylesheets: {joinTo: 'app.css'}
  }
}
```

Then, you can simply `require` jQuery in your application code, and Brunch will automatically know to bundle it:

```javascript
const $ = require('jquery');
```

Rebuild, refresh: it works!

## A note on NPM support

It can be a case that you absolutely **must** expose a certain package via a global variable.  To do so, you would add a `globals` definition into the config.  For example, if we wanted to expose jQuery globally as `$`, we would modify the config to look like this:

```js
module.exports = {
  npm: {globals: {
    $: 'jquery'
  }},

  files: {
    javascripts: {
      joinTo: {
        'libraries.js': /^(?!app\/)/,
        'app.js': /^app\//
      }
    },
    stylesheets: {joinTo: 'app.css'}
  }
}
```

Additionally, some packages ship with stylesheets.  To instruct Brunch to add these into the build, use the `styles` property in the npm config.  For example, if we installed the Pikaday package and wanted to include its styles, we'd adjust the config like this:

```js
module.exports = {
  npm: {styles: {
    pikaday: ['css/pikaday.css']
  }},

  files: {
    javascripts: {
      joinTo: {
        'libraries.js': /^(?!app\/)/,
        'app.js': /^app\//
      }
    },
    stylesheets: {joinTo: 'app.css'}
  }
}
```

Unlike with bower, npm packages don't normally point to the css files that should be included so you do have to manually specify these.

----

« Previous: [Starting from scratch](chapter04-starting-from-scratch.md) • Next: [A shot at templating](chapter06-a-shot-at-templating.md) »
