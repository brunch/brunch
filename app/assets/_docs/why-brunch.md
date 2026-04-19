# Why Brunch... And not Webpack, Grunt, or Gulp

<div class="toc-placeholder"></div>

## Philosophy behind Brunch

Brunch was built with two things in mind: **speed** and **simplicity**.

You will find that the [typical config of a Brunch application](https://github.com/brunch/with-react/blob/master/brunch-config.js) is an order of magnitude simpler, compared to Webpack, [Grunt](https://gist.github.com/paulmillr/eb3ae139aadbbb87ab9b#file-grunt-js), or [Gulp](https://gist.github.com/paulmillr/eb3ae139aadbbb87ab9b#file-gulp-js).

And that the time it takes to perform a fresh compilation?
It's times faster.
Even more so if you run the watcher — it will only rebuild what was changed, not everything, getting you incremental compilations in under 500ms.
(Obviously, you don't have to take our word for it. See [this story](https://github.com/brunch/brunch/issues/1234) shared with us by a webpack user.)

In order to achieve both goals, Brunch does have to make certain assumptions about your application, and thus be opinionated.
See the [core concepts page](/docs/concepts) for more on this.

Besides configs, brunch is also **simpler in terms of commands**.
Grunt / Gulp commands replicate all plugins it loads.
Brunch always has three commands: `new`, `build` and `watch`.
Build / watch commands may receive optional `production` flag which will tell Brunch to optimize assets, javascripts and stylesheets.

You can find a more in-depth discussion of what sets Brunch apart in [chapter 1 of the community-contributed guide](https://github.com/brunch/brunch-guide/blob/master/content/en/chapter01-whats-brunch.md#readme).

## Brunch vs Webpack

Webpack has been gaining quite some popularity lately.
Wondering how it compares with Brunch?

Where both are similar:

* module support is first-class
* have Hot Module Replacement ([`hmr-brunch`](http://github.com/brunch/hmr-brunch))
* have a notion of "compiler" / "loader" (although loaders are more than that)
* can `require` stylesheets

What Brunch can't do that Webpack can:

* asynchronous module loading / code splitting — brunch does have entry points functionality and can produce several js bundles though
* have clever processing of non-js/non-css assets

Unlike Webpack, Brunch:

* does not make you specify how to compile a file, every time you use it. Just add a compiler plugin and everything will Just Work™
* achieves faster build times

## Brunch vs Grunt/Gulp

These are more of task runners that allow you to create custom pipelines with lots of code.
Imperative.

To get first-class module support you would have to additionally configure and use Browserify or similar.

But even then, your rebuilds during `watch` won't be incremental — they will always start afresh and be slow.

## Brunch vs Rails Asset pipeline / LiveReload / CodeKit

With Asset pipeline there are similar disadvantages. With Brunch:

* You can use any backend you like, be it Node.js, Rails or Lift. You can even keep frontend and backend as separate projects.
* You'll get automated module support
* You'll have NPM & Bower support
* Rebuilds would be fast and incremental
