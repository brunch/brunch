# A shot at templating

This is part of [The Brunch.io Guide](../../README.md).

So what we’ve done in the previous chapter is awesome already, but what if we’d like a little dash of templating?  Surely you have a couple more minutes, right?

The idea behind Brunch’s approach to templating is simple:

  * Templates live in **their own files**, cleanly separated from JS or static HTML;
  * These files get **precompiled** by whatever engine handles the template syntax, to produce a ready-to-use **JS function**: you pass it an object holding whatever dynamic data the template needs (what’s usually called a *presenter* or *view model*), and it spews out HTML;
  * This function is **wrapped as a module**, as usual: it’s the module’s default export.

This **avoids littering your JS** with template code, as is too often seen with big fat `String` literals, and also **avoids littering your HTML** with hackish `<script type="text/handlebars">` blocks, which always looked godawful to me.  Sure, that leaves JSX, but even there we’ll have tricks to clean things up…

From a code editor standpoint, having separate files also means we usually get better syntax highlighting.

We’re going to use [Pug](https://pugjs.org/api/getting-started.html) ([formerly known as Jade](https://github.com/pugjs/pug/issues/2184)) because, well, it is very nice.  If you already do a lot of Ember, you might want to check out [Emblem](http://emblemjs.com/) too, that ties Ember and Pug-style code nicely together.

Let’s start by installing the plugin for Pug ([that hasn't been renamed from jade-brunch yet](https://github.com/pugjs/pug/issues/2184)):

```sh
npm install --save-dev jade-brunch
```

Now let’s tell Brunch to add the resulting modules in our app’s JS build, with a new line at the end of our `brunch-config.js`file:

```js
module.exports = {
  files: {
    javascripts: {
      joinTo: {
        'app.js': '/^app/',
        'libraries.js': '/^(?!app)/',
      },
    },
    stylesheets: { joinTo: 'app.css' },
    templates: { joinTo: 'app.js' },
  },
  npm: {
    globals: {
      $: 'jquery',
    },
  },
};
```

We can then add our template file, perhaps in `app/views/list.jade`:

```jade
h2 Things to do:

ul#mainTodo.tasks
  each item in items
    li= item
```

All set!  Using it inside our `application.js` is straightforward:

```javascript
"use strict";

var App = {
  items: ['Learn Brunch', 'Apply to my projects', '…', 'Profit!'],

  init: function() {
    var tmpl = require('views/list');
    var html = tmpl({ items: App.items });
    $('body').append(html);
  }
};

module.exports = App;
```

Rebuild, open your `public/index.html` file, and then…

![Our rendered template](../images/brunch-simple-templating.png)

How cool is that?!

----

« Previous: [Using third-party module registries](chapter05-using-third-party-registries.md) • Next: [Using Brunch on a legacy codebase](chapter07-using-brunch-on-legacy-code.md) »
