# Writing a Brunch plugin

This is part of [The Brunch.io Guide](../../README.md).

So the previous chapter listed quite a few cool plugins, but I’m sure you’re already thinking about the shiny new one you’d like to contribute, right?  Fear not, as I’m going to show you how to **write your own Brunch plugin**.

Brunch recognizes several plugin categories: compilers, linters, optimizers…  It detects that category based on which predefined methods you implement.  Depending on that category, you’ll get called at various moments of the build cycle, and in specific environments, too.

The [online API docs](http://brunch.io/docs/plugins) are not too bad, and then of course you can browse the source code for existing plugins to see how *they* pull it off.  In order to get your feet wet, we’ll make a compiler-type plugin—that’ll apply regardless of file extensions, though.

Earlier in this chapter I mentioned the `git-digest-brunch` plugin, that scans the resulting files for `?DIGEST` markers and replaces them with your Git HEAD’s SHA1: it’s trying to invalidate asset URLs for cache-busting purposes.  This plugin is confined to production mode, too (more specifically, it requires the `optimize` setting to be enabled).

We’ll write a variation on this: a plugin that replaces a free-form marker on the fly, both in one-shot build and watcher modes, regardless of the environment.  Our **functional spec** would read like this:

  * The **marker** defaults to `!GIT-SHA!`, but the part between exclamation marks can be **configured** through `plugins.gitSHA.marker`.
  * The transformation can happen **at any time, on the fly** (one-shot builds or watcher, production or not).
  * All watched files, regardless of their extension, are processed; the only exception is “pure static” files (those under an `assets` directory).
  * The marker, just like watched file paths, **can contain regex-special characters** without breaking anything.

Now that we have this nailed, where should we start?  A Brunch plugin is first and foremost **a Node module**, so let’s begin by creating a `git-sha-plugin` folder and adding the following `package.json` in it:

```json
{
  "name": "git-sha-brunch",
  "version": "1.8.0",
  "private": true,
  "peerDependencies": {
    "brunch": "~1.8"
  }
}
```

The `peerDependencies` part is optional (it’s even on its way to deprecation), but I like it…  On the other hand, it’s been an informal convention that Brunch plugins should track the major and minor version numbers of the Brunch they’re compatible with.  So if you don’t try for compatibility below Brunch 1.8, your plugin version should start at 1.8, for instance.  Note that this conflicts with [semver](http://semver.org/), so the team is trying to figure out a better way to express plugin/core compatibility.

Because we didn’t specify a `main` property in our package file, Node will assume that the module’s entry point file is `index.js`.  We also know that a Brunch plugin is a constructor with a `prototype` equipped with several specific properties, that we mentioned earlier in this chapter:

  * `brunchPlugin` must be `true`;
  * `type`, `extension` or `pattern` can be used to filter down the files that should trigger processing;
  * `preCompile(…)` if you want to get something done before compilation proper starts;
  * `compile(…)`, `lint(…)` or `optimize(…)`, depending on what role your plugin has;
  * `onCompile(…)` if you want to be notified when the build is complete (even in watcher mode);
  * `teardown(…)` if you need to clean up when Brunch shuts down (e.g. stop an embedded server started by your constructor).

(Actually, `brunchPlugin` is the only property that **has to be on `prototype`**: all the other ones are used on the instance, so they could be defined dynamically by the constructor if need be, which in practice mostly happens for `pattern`).

So here’s our skeleton `index.js` file:

```js
'use strict';

// Default marker.  Can be configured via `plugins.gitSHA.marker`.
const DEFAULT_MARKER = 'GIT-SHA';

// Helper: escapes any regex-special character
function escapeRegex(str) {
  return String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

class GitShaPlugin {
  constructor(config) {
    // 1. Build `pattern` from config

    // 2. Precompile the marker regexp from config
  }

  // On-the-fly compilation callback (file by file); assumes Brunch already
  // accepted that file for our plugin by checking `type`, `extension` and
  // `pattern`.
  compile(file) {
    // No transformation for now
    return Promise.resolve(file);
  }
}

// Tell Brunch we are indeed a plugin for it
GitShaPlugin.prototype.brunchPlugin = true;

// The plugin has to be the module’s default export
module.exports = GitShaPlugin;
```

Alright!  Let’s start with the constructor.  We don’t mandate a specific file type (scripts, styles or templates), so we don’t define a `type` property on our prototype, nor a specific `extension` value.  That leaves us with `pattern`, which is a [regular expression](http://regexone.com/).

Because we are dependent on paths, not extensions, we need access to the configuration, so we can dynamically build our filters from it.  That makes for the following code at the beginning of the constructor:

```js
let pattern = config.paths.watched.map(escapeRegex).join('|');
pattern = `^(?:${pattern})/(?!assets/).+`;
this.pattern = new RegExp(pattern, 'i');
```

This way, the default watched paths (`['app', 'vendor', 'test']`) yield the following pattern: `/^(?:app|vendor|test)\/(?!assets\/).+/i`.

Now on to the marker.  The code to get it is a bit simpler:

```js
const {marker = DEFAULT_MARKER} = config.plugins.gitSHA;
this.marker = new RegExp(`!${escapeRegex(marker)}!`, 'g');
```

We’re certain that `config.plugins` exists, even if it’s an empty object.  So its `gitSHA` property might be `undefined`, hence the `|| {}` to guarantee an object, even if empty.  We grab `marker` from it, again possibly `undefined`, which would result in `DEFAULT_MARKER`.  But if the setting’s defined, we get it.

Then we compile the regex once and for all.

Now, every time `compile(…)` is called (which means the file we get matched our `pattern`), we’ll need to get the current Git HEAD’s SHA1, and proceed to replacing it through the file’s in-memory content.

We don’t get this SHA just once at construction time, because committing along throughout the dev phase is a common scenario (without stopping Brunch’s watcher, that is), so our value would quickly become obsolete.

We get this information by running a `git rev-parse --short HEAD` as a command line, which we’ll do the Node way: asynchronously.  Therefore, we need the caller to supply a callback we’ll call in due time, possibly with an error (like, you’re not even in a Git repo, pal!).

Here’s our small helper function:

```js
const {exec} = require('child_process');

function getSHA(callback) {
  exec('git rev-parse --short HEAD', function(err, stdout) {
    callback(err, err ? null : stdout.trim());
  });
}
```

Finally, we write the processing proper:

```js
compile(file) {
  return new Promise((resolve, reject) => {
    getSHA((err, sha) => {
      if (err) return reject(err);
      file.data = file.data.replace(this.marker, sha);
      resolve(file);
    });
  });
}
```

And *voilà!*

To **test our plugin without littering the npm registry**, we’ll do what’s called an `npm link`: the local installation of a module that is still under development.

If you grabbed the [sample repo](https://github.com/brunch/brunch-guide-demos), we’ll use two of its directories:

  * `6-templates`, the last phase where we didn’t have a custom server, and
  * `8-git-sha-plugin`, that contains this demo plugin’s code, all nicely commented.

Here’s how to perform the link:

  1. Get inside `8-git-sha-plugin` from the command line;
  2. Run an `npm link`:  this will register the current folder as source for future `npm link git-sha-brunch` commands;
  3. Get inside `6-templates` from the command line;
  4. Run an `npm link git-sha-brunch`: this will sort of install it locally, linking to your source folder;
  5. Do add your new local module to `package.json` (`npm link` won’t), and make sure you don’t forget the extra comma this will require on the previous line, so you don’t break the JSON:

```json
{
  "name": "simple-brunch",
  "version": "0.1.0",
  "private": true,
  "devDependencies": {
    "brunch": "^1.8.3",
    "jade-brunch": "^1.8.1",
    "javascript-brunch": "^1.7.1",
    "sass-brunch": "^1.8.10",
    "git-sha-brunch": "^1.8.0"
  }
}
```

If you don’t list it in `package.json`, Brunch won’t see it (it loops through `package.json`, not just the contents of `node_modules`).

If you hadn’t grabbed this repo through a `git clone`, you’re probably not in a Git repo just now.  If you do have Git available in your command line, here’s how to get a HEAD quickly:

```sh
$ git init
Initialized empty Git repository in …/6-templates/.git/
$ git commit --allow-empty -m "Initial commit"
[master (root-commit) 8dfa8d9] Initial commit
```

(You’ll get a different SHA, of course.)

OK, we’re all set to try this out.  Here’s a simple test scenario: open `app/application.js` (from this same tree) in your editor, and add a comment along the lines of `// Version: !GIT-SHA!` in a couple spots.  Save.  Run the build.  Then check the contents of `public/app.js`: the SHA replaced the marker.  You can also try it as the watcher is running: this works too! ᕙ(⇀‸↼‶)ᕗ

----

« Previous: [Plugins for all your build needs](chapter11-plugins.md) • Next: [Conclusion](chapter13-conclusion.md) »
