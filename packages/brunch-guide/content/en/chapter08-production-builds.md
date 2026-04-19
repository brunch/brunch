# Production builds

This is part of [The Brunch.io Guide](../../README.md).

By default, Brunch runs in a **development** environment, or mode.  This mostly means minification plugins (be it JS or CSS) don’t run (because the `optimize` setting defaults to `false` in development mode; which you can change, if you really want to).

You specify what environment to run in through the `-e` or `--env` CLI option, followed by the environment’s name.  You can have any environments you want, with a special case for `production`, that is predefined with `optimize` set to `true`, and has its own CLI shortcut `-P` (or `--production`).

More importantly, you can **alter settings based on the environment**, through the root settings key `overrides`.  In it, you can have one key per environment, each with replacements (overrides…) for any general settings you may have.  The official docs use an example that actually reflects the **default production settings**:

```js
overrides: {
  production: {
    optimize: true,
    sourceMaps: false,
    plugins: {autoReload: {enabled: false}},
  }
}
```

Personally I like my sourcemaps no matter what, so I would override defaults like so:

```js
overrides: {
  production: {
    sourceMaps: true
  }
}
```

Please note that you don't have to use `overrides` to tweak your settings in **development** mode. This is Brunch's default mode, so there is nothing to override. You can just add your setting to the top level of your config file. To pick up the example from above and enable the `optimize` setting for development builds:

```js
module.exports = {
  optimize: true
  // ...
}
```

----

« Previous: [Using Brunch on a legacy codebase](chapter07-using-brunch-on-legacy-code.md) • Next: [Watcher](chapter09-watcher.md) »
