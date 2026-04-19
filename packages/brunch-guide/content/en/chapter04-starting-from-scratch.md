# Starting from scratch

This is part of [The Brunch.io Guide](../../README.md).

If you’ve carefully read through the previous sections, well done you :clap:, I know it can be tempting to skip straight to the code/tutorial.  I’m sure you’re glad you read these chapters, though. :grin:

## How about a shortcut?

If you’d like to **follow along easily**, I set up a public repository on GitHub that has every step of the way available:

  * [The GitHub repo](https://github.com/brunch/brunch-guide-demos)
  * If you don’t use Git, grab an archive: [Zip](https://github.com/brunch/brunch-guide-demos/archive/master.zip) or [TGZ](https://github.com/brunch/brunch-guide-demos/archive/master.tar.gz).

## Just a couple files

Let’s start with a first example, that’ll stick with Brunch’s conventions, but not start off a skeleton.  We’ll go with simple JS (ES3/ES5), a SASS stylesheet and static HTML.

Our tree looks like this:

```text
.
├── app
│   ├── application.js
│   ├── assets
│   │   └── index.html
│   └── styles
│       └── main.scss
└── package.json
```

Here are the files we start with (you’ll find these in `0-starter` in the repo):

`app/assets/index.html`:

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Simple Brunch Demo</title>
  <link rel="stylesheet" href="app.css">
</head>
<body>
  <h1>
    Brunch
    <small>• A simple demo</small>
  </h1>
  <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>
  <script src="app.js"></script>
</body>
</html>
```

`app/styles/main.scss`:

```scss
$default-bg: white;
$default-text: black;

body {
  font-family: Georgia, serif;
  font-size: 16px;
  background: $default-bg;
  color: $default-text;
}

h1 {
  font-size: 2em;
  margin: 0.5em 0 1em;

  & > small {
    color: gray;
    font-size: 70%;
  }
}
```

`app/application.js`:

```js
'use strict';

const App = {
  init() {
    console.log('App initialized.');
  }
};

module.exports = App;
```

Finally, `package.json`:

```json
{
  "name": "simple-brunch",
  "version": "0.1.0",
  "private": true
}
```

## Installing a starting set of Brunch modules

Now we’ll “install” Brunch and the minimum set of modules we need in this case, locally to the current app:

```
$ npm install --save-dev brunch javascript-brunch sass-brunch
…

$ npm ls -depth=0
simple-brunch@0.1.0 …
├── brunch@1.8.3
├── javascript-brunch@1.7.1
└── sass-brunch@1.8.10
```

Finally, we need a minimal **Brunch configuration**.  A Brunch configuration file is just a Node module that exports at least a `files` property that describes concatenations.  Here’s our `brunch-config.js`:

```js
module.exports = {
  files: {
    javascripts: {joinTo: 'app.js'},
    stylesheets: {joinTo: 'app.css'}
  }
}
```

And yes, **that’s it!** :grin:

## Our first build

OK, let’s go for our first build.  From the app’s root directory, where `brunch-config.js` is (at the same level as `app`) just do:

```
$ brunch build
25 Feb 17:07:20 - info: compiled 2 files into 2 files, copied index.html in 94ms
```

Note how long that one-shot build took: **94 milliseconds**.  And that’ on a live-encrypted disk.

Here’s what Brunch will have put in `public`:

```text
public/
├── app.css
├── app.css.map
├── app.js
├── app.js.map
└── index.html
```

The files from `assets/` are there alright (hence the `index.html`), and the concatenations too, along with their sourcemaps.  Let’s have a look at `app.css`:

```css
/* line 4, stdin */
body {
  font-family: Georgia, serif;
  font-size: 16px;
  background: white;
  color: black; }

/* line 11, stdin */
h1 {
  font-size: 2em;
  margin: 0.5em 0 1em; }
  /* line 15, stdin */
  h1 > small {
    color: gray;
    font-size: 70%; }


/*# sourceMappingURL=app.css.map*/
```

Not too shabby.  What about `app.js`?  It starts with Brunch’s “bootstrapper”, less than a hundred lines of JS code that provide module management and `require(…)` logic, then we get our modules, neatly wrapped.  Here are lines 93 and below, check out the `require.register(…)` plumbing for module registration:

```js
require.register("application", function(exports, require, module) {
"use strict";

var App = {
  init: function init() {
    console.log("App initialized");
  }
};

module.exports = App;

});


//# sourceMappingURL=app.js.map
```

Because our JS is now modularized, nothing appears in the console when we load the page: we need to **require the module** that serves as our app’s entry point.

By default, **modules are named from their path** inside the watched paths that are subject to module wrapping.  If you only have one such path, it won’t prefix module names (this is our case, as just `app` is relevant).  If you have many such paths, their basename will prefix module names.  The file extension is not used, which lets you use whatever script syntax you’d like (e.g. CoffeeScript or TypeScript).

As we have an `app/application.js` file, the module name is just `"application"`, as you can see above.  So at the end of our `<body>`, inside `app/assets/index.html`, we just add the following at line 15:

```html
<script>require('application').init();</script>
```

Let’s run the build again:

```sh
$ brunch b  # Shortcut for "brunch build"
```

And now, if we refresh this:

![Our module runs at page load](../images/brunch-simple-console.png)

Notice the path you get in the log: `application.js:5` instead of `app.js:98`: this is sourcemaps for you!  If you don’t get this mapping, check that sourcemaps are enabled in your developer tool settings, and also open developer tools *before* refreshing the page, otherwise sourcemaps won’t get loaded in time.  In doubt, once the console is visible, just refresh the page.

Sourcemaps work for CSS, too:

![Sourcemaps work for CSS as well](../images/brunch-simple-styles.png)

Notice the `main.scss:2` location for our `body` rule?  And if you click it (or one of its properties), you’ll get the original source code, naturally.

## Globals; because, reasons.

Now let’s say we want to use jQuery, or another library.  If we already have code that assumes jQuery is available as a global variable, we’ll either need to migrate our code (which is a must-do in the long run), or leave jQuery as a non-wrapped codebase (which is acceptable as a transition hack).

Let’s say our `application.js` needs to inject content at the end of the `<body>`:

```js
'use strict';

const App = {
  init() {
    $('body').append('App initialized.');
  }
};

module.exports = App;
```

We’ll first stay with the global-variable approach, as a transition thing.  So we put our `jquery.js` in a new `vendor` folder, in the same place as `app`, and rebuild.  When we refresh, it works, and the message appears at the end of our page:

![Global jQuery kinda works](../images/brunch-simple-jquery.png)

The entire jQuery codebase is actually injected as-is between Brunch’s “bootstrapper” code and our own wrapped modules.  Brunch will inject all the files in `vendor` there, in alphabetical order (unless we specify another order in our configuration).

## Getting modular again

Still, that gross global variable isn’t so good, that’s just sloppy, wouldn’t you say?  Especially considering that jQuery has a sort of UMD loader in it, so it can detect CommonJS module wrapping and export itself properly.  So let’s try to refactor our code instead.

Let’s just move `jquery.js` from `vendor` to `app`, so it gets wrapped as a module with a simple name `"jquery"`.  Feel free to remove the now-empty `vendor` directory.

Next, let’s adjust our `application.js` so it explicitly requires `jquery`, using the idiomatic `$` name for it locally (yes, locally: we’re in a module, remember?).  See line 3 here:

```js
'use strict';

const $ = require('jquery');

const App = {
  init() {
    $('body').append('App initialized.');
  }
};

module.exports = App;
```

We rebuild, refresh, and it still works! :heart:

## Split targets

A common recommendation here is to **put your third-party libraries in a separate bundle**, because they’ll change **far less often** than your own codebase: so by using two targets, one for third-party and one for your own code, you get two initial loads instead of one, but then only require refreshing your own, **vastly smaller** bundle later on.

Here’s a sample Brunch configuration that achieves this split; because our third-party code is not currently grouped in a special directory, but just slapped casually at the root of our watched path for their module names to stay simple (we’ll learn how to set that up in a more flexible way later), we’ll list them explicitly, here through a regex.

This is our updated `brunch-config.js`:

```js
module.exports = {
  files: {
    javascripts: {
      joinTo: {
        'libraries.js': /^app\/jquery\.js/,
        'app.js': /^(?!app\/jquery\.js)/
      }
    },
    stylesheets: {joinTo: 'app.css'}
  }
}
```

As soon as you have multiple targets, your `joinTo` properties become objects mapping a target name (the property key) with a description of matching sources (the property value).  These descriptions are [anymatch sets](https://github.com/es128/anymatch#anymatch--), which can be specific names, globbings, regexes, predicate functions, or an array mixing any of these.  In short, it’s super flexible.

For this to still work, you’ll need to adjust the bottom of your `index.html` file in `assets` to properly load both target scripts:

```html
<script src="libraries.js"></script>
<script src="app.js"></script>
<script>require("application").init();</script>
```

----

In the next chapter, we’ll learn how to rely on third-party module registries to be able to use versioned dependencies for our code.

« Previous: [Conventions and defaults](chapter03-conventions-and-defaults.md) • Next: [Using third-party module registries](chapter05-using-third-party-registries.md) »
