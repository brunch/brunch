# Brunch: Core concepts

Brunch operates on a set of assumptions about how your app is authored and compiled — this allows to make your configs drastically simpler and achieve faster build times.

Any Brunch **project** consists of the following:

* a **config**, which allows you to customize various aspects of Brunch, as well as configure plugins (see [config reference](/docs/config))
* **`package.json`**, which lists the plugins you want Brunch to use, as well as your app's own dependencies
  * a **plugin** is what allows Brunch to provide any custom behavior or handle all the various JS-/CSS- transpiled languages for you (see [Using plugins](/docs/using-plugins) and [plugins list](/plugins) to get an idea)
* **source files** — files that you author in your preferred language, which later get compiled into either JS or CSS
* **assets** — files that are copied as-is (in some cases these can be compiled too, e.g. Jade &rarr; HTML)
* **vendor files** — JS and CSS files that do not need any processing
* **output files** refer to the browser-ready JS bundles or stylesheets, which are obtained by joining your source files into one

What Brunch does, in essence, is this:

1. compile your source files using appropriate plugins
1. concatenate several compiled source files into one
1. write the result into a file
1. copy assets

That's all there is, really. While Brunch does assume your code is going to live under `app/` and your assets under `app/assets/`, and build result is put under `public/`, you are by all means free to use your own structure. Just [tell Brunch what it is](/docs/config.html#paths).

The only required piece of configuration is telling Brunch which output files you want — and it couldn't be simpler:

```js
module.exports = {
  files: {
    javascripts: {joinTo: 'app.js'},
    stylesheets: {joinTo: 'app.css'}
  }
}
```

This will concatenate all your javascript files into `public/app.js`.

If you want a little more control, like splitting your app code from vendor files into separate bundles, that's just as easy:

```js
module.exports = {
  files: {
    javascripts: {joinTo: {
      'app.js': /^app/,       // all code from 'app/',
      'vendor.js': /^(?!app)/ // all BUT app code - 'vendor/', 'node_modules/', etc
    }},
    stylesheets: {joinTo: 'app.css'}
  }
}
```

The Brunch config is **declarative**, not **imperative** — you tell Brunch what you want to get, not how to actually do it.
