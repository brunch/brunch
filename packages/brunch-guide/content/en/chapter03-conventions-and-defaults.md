# Conventions and defaults

This is part of [The Brunch.io Guide](../../README.md).

The [official docs](http://brunch.io/docs/getting-started) do a good job of explaining Brunch’s conventions.  Pretty much all of them can be overridden through configuration, to better fit your specific needs.

Do keep in mind that what we’ll be seeing here describes **the default behavior**, nothing is absolutely mandatory.  That being said, the more you follow these conventions, the less code/configuration you’ll have to create and maintain in order to enjoy Brunch’s benefits.

For every section, I will succinctly list the command line options and configuration settings you can use to choose another way; for full details, [this page is your friend](http://brunch.io/docs/config).

## Built-in processing

Brunch will always take care of the following for you, from the get-go:

* **Concatenate** files, by category, towards 1+ target files you define;
* **Publish** the resulting files in a target directory, along with **static asset files** you may have put in proper folders;
* **Wrap** the relevant JS source files as **CommonJS modules** (during the concatenation phase);
* Produce the matching **sourcemaps** so you can easily debug in your browser by using the source contents, not the resulting files;
* **Watch** your source files and trees for changes, triggering an incremental build update on any relevant change (if you run Brunch in watch mode instead of one-shot build);
* Provide an **HTTP server** that does more than just static file serving (if you ask for the server to launch).

The exact nature of the concatenated files depends on the **installed plugins**, though.  We’ll get to that later, and dive first into the details of these default behaviors and features.

## Configuration files

Brunch will look for its configuration in the first of the following files it finds in the current directory:

* **`brunch-config.js`**
* `brunch-config.coffee`

Historically, Brunch looked for `config.*` files, but that quickly proved to be too generic a name, so it now favors the more explicit ones.

*Customizing: a CLI option used to let you specify a config file, but that is deprecated in favor of a single file with per-environment overrides, something we'll illustrate in a later chapter.*

## Folders

By default, Brunch pays attention to the following folders:

* `app` contains the entire *source codebase*, except for third-party JS files that are not designed to be wrappable as CommonJS modules.  You’d find there a tree of script files, style sheets and template files.
* Any `assets` folder (usually just `app/assets`) will get its contents **copy-pasted** (recursively) into the target folder, as-is, **without any processing**.
* Any `vendor` folder (usually just one besides `app`) will have its contents concatenated, much like `app`, with a significant difference: its script files **will not get wrapped in modules**.  You’d generally put there third-party libraries that do not play well with being wrapped as modules (no UMD-style loader, etc.).  You’d also put there code that *is* capable of being wrapped, but that your current codebase still relies on as globals (for now :wink:) instead of using `require(…)`.
* Any file whose name starts with an underscore (`_`) is considered a partial, to be embedded into another file, and is therefore not processed standalone.
* `public` is the default **target folder**.  This is consistent with the conventions of numerous micro-servers and middleware systems such as [Rack](http://rack.github.io/).

The `app`, `vendor` and `public` folders are considered relative to Brunch’s configuration file.

*Customizing: source paths can be changed through an array of names/paths in the `paths.watched` setting.  The target folder is set by `paths.public`.  Special-treatment folders are defined through `conventions.assets` and `conventions.vendor` (which can be regexes or functions).  Ignored files (not processed standalone, that is) are specified in `conventions.ignored`.*

## CommonJS module wrapping

**Modules are Good.**  If you’re still playing the globals game, without formal dependencies of any kind, it’s **high time you catch that train…** We’ve been preaching JS modules for **six years**, there even was a sort of formats war that ended with **[native ES6 modules](http://jsmodules.io/)** winning, which [look more like](http://jsmodules.io/cjs.html) Node’s popular **CommonJS** format than this good ol’ AMD (and AMD is on the way out now).

The signs are all there: on the one hand, **major projects** such as [Ember 2](http://www.ember-cli.com/using-modules/) and [Angular 2](https://www.airpair.com/angularjs/posts/preparing-for-the-future-of-angularjs#3-4-transition-to-es6-modules) are switching to native ES6 modules, on the other hand [isomorphic JS](http://isomorphic.net/) is on a meteoric rise, with tools like [Browserify](http://browserify.org/), that package code “Node style” for in-browser execution (and even shim several core Node modules), gaining in popularity at break-neck pace.

By default, Brunch wraps your own script files (unless they’re in `vendor`) as **CommonJS modules**: they therefore exist in a closure (all your explicit declarations, notably `var` and `function`, are thus private).  Because of this, you can (I should say you *ought to*) slap a big fat `"use strict";` at the top of your files, without fear of mandating strict mode for third-party scripts.  You also have automatic access to `exports`, `module.exports` and `require(…)`.

*Customizing: `modules.wrapper` and `modules.definition` specify the type of wrapping you use (you can also disable it, period), and `modules.nameCleaner` lets you define how source file paths map to module names.*

## Sourcemaps

Any concatenation, minification, and generally any kind of processing step between source files and resulting files is tracked by sourcemaps.

Every target file comes with a matching v3 multi-level sourcemap file that lets your tools (such as your browser’s developer tools) **display and debug the original source files, right at the beginning of your build chain**, instead of the target files that are actually used by your runtime.

This is a must-have for sane debugging.

*Customizing: the `sourceMaps` setting can disable, or downgrade, sourcemap generation.  But why on Earth would you want that!?*

## Watcher

Brunch can, out of the box, watch your files and trees in order to **automagically update the build** when changes are detected.  This update is **incremental and super-fast**.  Brunch will log a detailed message telling you what source files changed, what target files got updated, and how long this all took.

Do note that watching is not always 100% reliable, though, rarely on Windows.  A couple settings can help reduce what rare faux-pas you could see, we’ll explore these later.

This watching happens when you use the `brunch watch` command instead of the one-shot `brunch build`.

By the way, you can also get **notified** when an error happens (or if you tweak settings, for warnings and info as well), which spares you from even having to keep an eye on your terminal.  This will require some setup depending on your OS, however.

On OSX, you'll need to install `terminal-notifier`, which is distributed as a Ruby gem.  Just run the following in your terminal:

```sh
$ sudo gem install terminal-notifier
```

On Ubuntu, you need to install the `notify-send` command, which is distributed through the `libnotify-bin` package, so your command would be:

```sh
$ sudo apt-get install libnotify-bin
```

On Windows, you need to install [Growl for Windows](http://www.growlforwindows.com/gfw/default.aspx), then download [`growlnotify`](http://www.growlforwindows.com/gfw/help/growlnotify.aspx) and put the binary for it somewhere in your PATH.

For all systems, you can then verify this works by installing the `growl` npm module, and running a bit of test code:

```sh
$ npm install growl
$ node -e "require('growl')('This is a test')"
```

These instructions are current as of early April 2015; should they fail, check out the documentation for the [growl npm module](https://www.npmjs.com/package/growl), that is used internally for the notification feature.

*Customizing: the `fileListInterval` setting defines the minimum time between two checks for change detection.  The `watcher.usePolling` setting changes the underlying tech used for change detection, opting for something ever so slightly slower, but more reliable on a few platforms.  The `notifications` setting lets you disable notifications or change what message levels trigger them; see [this page](https://github.com/paulmillr/loggy) for full details.*

## Built-in web server

Brunch comes with a built-in **HTTP server** that can serve your target files statically, letting you use HTTP for testing instead of simple file access.  This assumes you’re running in watcher mode. We’ll explore the details of this server later on (we’ll even learn how to write our own when needed) but for now, here’s a quick rundown on what you’ll get when calling `brunch watch --server`:

  * HTTP listener on port 3333, with `/` mapped to your target folder.
  * Automatic serving of `index.html` on folder URLs or unknown paths (so you can use `pushState` on the client side, mostly).
  * [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) headers.

*Customizing: the `server` setting is an object that lets you alter every built-in behavior and feature, or go all-out and specify your own custom server module.  The CLI option `-p` (or `--port`) lets you change the listening port from the command line.*

## Plugin loading

We’ll explore plugins in great detail in the last chapter of this guide.  For now, you just need to know that to use a Brunch plugin, all you have to do is install it with `npm`: **its mere presence in `node_modules` and `package.json` is enough** for it to be detected and loaded by Brunch, and it will be automagically used for file types and environments it registered itself for.

Most Brunch plugins are designed to be **useful and operational without any configuration**.

*Customizing: you can choose which plugins to enable/disable through the `plugins.on`, `plugins.off` and `plugins.only` settings.  You can also fine-tune their behavior through settings starting with `plugins.<name>`.*

----

Aaaaand well done you, you’ve made it through all the “lay of the land” material of this guide.  It’s time to **crank out some code!**.  On to the next chapter, and the concrete side of things.

« Previous: [Getting started with Brunch](chapter02-getting-started.md) • Next: [Starting from scratch](chapter04-starting-from-scratch.md) »
