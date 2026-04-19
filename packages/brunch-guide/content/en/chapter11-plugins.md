# Plugins for all your build needs

This is part of [The Brunch.io Guide](../../README.md).

With Brunch, features don’t get provided through the same architectural split as you’d find in Grunt, Gulp, etc.  A ton of features and behaviors are **built-in** (build pipeline, incremental watcher, sourcemaps, etc.) but everything else remains in **plugins**, including the handling of every **source language**.

You will generally use at least one plugin for scripts, one for styles, and a minifier for each.

The official website [has a decent list](http://brunch.io/plugins.html), based on authors’ pull requests, but there are actually [a lot more](https://www.npmjs.com/search?q=brunch); we’ll try and browse through the main ones below.

**Note:** in this chapter’s text, plugin names are always **links** to their npm homepage (featuring their description, links, download counts, etc.).

## Enabling a plugin

For a plugin to be enabled and used, **you just need to install it**, which means it is both in `package.json` and `node_modules`.  The easiest way to do that for the first time is with `npm install --save-dev <pluginName>`, and the easiest way from an existing `package.json` is through a simple `npm install`.

Brunch will then inspect all modules that satisfy both these requirements, looking for any module whose default export is a constructor featuring a `brunchPlugin` property set to `true` on its `prototype` property.  Otherwise, the module is ignored.

Any module that passes this filter has its constructor automatically instantiated, with the global configuration passed as argument, and gets registered based on its scope declaration (file type, extensions, pattern…  we’ll dive into this later).

In short, forget about crazy splatters of redundant `loadNpmTasks` here.  Brunch keeps it short and sweet.

It’s worth noting that **plugin order matters** (as in, the order in which they’re listed in `package.json`): when plugins operate on the same files (usually target files), their order can impact their ability to work.  For instance, [`groundskeeper-brunch`](https://www.npmjs.com/package/groundskeeper-brunch) requires running *before* any minifiers, as these will obfuscate some code constructs the former relies on to detect trimmable code.

## Fine-tuning through optional configuration

Every plugin is usually designed to be **operational and useful without any configuration**; that being said, it’s often possible to tweak their behavior through specific configuration.  These settings are defined inside `brunch-config.js`, under the `plugins` key and a subkey named after the plugin.

For instance, the [`appcache-brunch`](https://www.npmjs.com/package/appcache-brunch) plugin looks for `plugins.appcache`.  Most often, key names are trivial to infer, but they can stray from an exact match, or opt for camel case…  Just like [`browser-sync-brunch`](https://www.npmjs.com/package/browser-sync-brunch) that looks for `plugins.browserSync`.  Check out the plugin’s documentation to be sure!

## Brunch and CSS

CSS-related plugins feature a `type` of `"stylesheet"` on their prototype, and usually provide a specific value for their `extension` property.  These are mostly *transpilers*, what Brunch generically refers to as *compilers*.  At the time of this writing, the main ones are:

  * [`css-brunch`](https://www.npmjs.com/package/css-brunch), for vanilla (W3C) CSS files;
  * [`less-brunch`](https://www.npmjs.com/package/less-brunch) and [`sass-brunch`](https://www.npmjs.com/package/sass-brunch) for [Less](http://lesscss.org/) and [Sass](http://sass-lang.com/). `sass-brunch` also comes with [Compass](http://compass-style.org/) support out of the box.
  * [`stylus-brunch`](https://www.npmjs.com/package/stylus-brunch) for [Stylus](http://learnboost.github.com/stylus/), my personal favorite;
  * There are various Swiss-army knives for CSS; they get plugins, such as
  [`postcss-brunch`](https://www.npmjs.com/package/postcss-brunch) for [PostCSS](https://github.com/postcss/postcss), [`pleeease-brunch`](https://www.npmjs.com/package/pleeease-brunch) for [pleeease](http://pleeease.io/) or  [`rework-brunch`](https://github.com/bolasblack/rework-brunch) for [rework](https://github.com/reworkcss/rework).
  * When it comes to *coding style*, [CSSComb](http://csscomb.com/) is nice and offers plugins for builders, including [`csscomb-brunch`](https://www.npmjs.com/package/csscomb-brunch).

## Brunch and JavaScript

This is a similar landscape to CSS, except `type` is now `"javascript"`.  I’ll talk about linters later, but sticking with *transpilers* we’re pretty well stocked already:

  * [`json-brunch`](https://www.npmjs.com/package/json-brunch), so you can use JSON files directly as modules;
  * [`coffee-script-brunch`](https://www.npmjs.com/package/coffee-script-brunch), of course, and even [`iced-coffee-script-brunch`](https://www.npmjs.com/package/iced-coffee-script-brunch) for hotheads;
  * In the same corner, but way less popular, you can get [`LiveScript-brunch`](https://www.npmjs.com/package/LiveScript-brunch) for [LiveScript](http://gkz.github.io/LiveScript/), [`ember-script-brunch`](https://www.npmjs.com/package/ember-script-brunch) for the rather niche [EmberScript](https://github.com/ghempton/ember-script), [`roy-brunch`](https://www.npmjs.com/package/roy-brunch) for the *even more niche* [Roy](http://roy.brianmckenna.org/) and [`typescript-brunch`](https://www.npmjs.com/package/typescript-brunch) for the vastly better-known [TypeScript](http://www.typescriptlang.org/).
  * Subtler stuff: [`wisp-brunch`](https://www.npmjs.com/package/wisp-brunch) handles [Wisp](https://github.com/Gozala/wisp), a kind of ClojureScript, and [`sweet-js-brunch`](https://www.npmjs.com/package/sweet-js-brunch) opens the heavenly doors of “hygienic macros” thanks to [sweet.js](http://sweetjs.org/).

And just because this is 2017 after all, you’ll find a bunch of options for automatic JSX (React) processing and ES6 goodness:

  * [`babel-brunch`](https://www.npmjs.com/package/babel-brunch) let you use a ton of ES6 features.  Currently, [Babel](https://babeljs.io/) (formerly 6to5 + CoreJS) is [solidly ahead](http://kangax.github.io/compat-table/es6/#babel) when it comes to feature coverage, and what’s more, it can handle JSX too!
  * [`traceur-brunch`](https://www.npmjs.com/package/traceur-brunch) transpiler by Google.

## Brunch and templates

After scripts and styles, the third category of files that Brunch has special processing for is templates.

Let me reiterate: a template plugin for Brunch is a compiler that turns a template into a **module whose default export is a pre-compiled function**, hence you do not incur any run-time penalty.  That function takes as unique argument an object whose properties are directly usable by your template, just like local variables: what is commonly referred to as a *presenter* or *view model*.  The function synchronously returns HTML.

When it comes to template languages, we have **a world of choices**:

  * **All-time classics**:
    * [`handlebars-brunch`](https://www.npmjs.com/package/handlebars-brunch) and an [`ember-handlebars-brunch`](https://www.npmjs.com/package/ember-handlebars-brunch) specialization, obviously;
    * [`hoganjs-brunch`](https://www.npmjs.com/package/hoganjs-brunch) if you favor Hogan, a common alternative;
    * [`jade-brunch`](https://www.npmjs.com/package/jade-brunch) for my beloved [Jade](http://jade-lang.com/), and even a [`jade-angularjs-brunch`](https://www.npmjs.com/package/jade-angularjs-brunch) specialization, that produces an Angular module.
  * **The almighty** [Dust](http://akdubya.github.io/dustjs/) has superb support through [`dustjs-linkedin-brunch`](https://www.npmjs.com/package/dustjs-linkedin-brunch) for LinkedIn’s [Dust extension](http://linkedin.github.io/dustjs/), also used by PayPal, among other high-profile users…
  * Someone came up with [`jade-react-brunch`](https://www.npmjs.com/package/jade-react-brunch), that **avoids having to use kludgy JSX by letting you use a separate Jade file**, but outputs code using the `React.DOM` builder, just like JSX literals…  This makes me drool, I must say!
  * Then you’ll get a lot of more niche syntaxes:
    * [`eco-brunch`](https://www.npmjs.com/package/eco-brunch) for [Eco](https://github.com/sstephenson/eco), an ERB variant that used CoffeeScript;
    * [`emblem-brunch`](https://www.npmjs.com/package/emblem-brunch) for [Emblem](http://emblemjs.com/), which is much like Jade but has a lot of syntactic sugar for Ember and Handlebars regulars;
    * [`markdown-brunch`](https://www.npmjs.com/package/markdown-brunch) and [`yaml-front-matter-brunch`](https://www.npmjs.com/package/yaml-front-matter-brunch), which end up looking kinda like Jekyll;
    * [`swig-brunch`](https://www.npmjs.com/package/swig-brunch) for [Swig](http://paularmstrong.github.io/swig/), for the Django fans out there;
    * [`ractive-brunch`](https://www.npmjs.com/package/ractive-brunch) for [RactiveJS](http://www.ractivejs.org/);
    * [`nunjucks-brunch`](https://www.npmjs.com/package/nunjucks-brunch) for [Nunjucks](http://mozilla.github.io/nunjucks/), and finally
      * [`html2js-brunch`](https://www.npmjs.com/package/html2js-brunch) for [HTML2JS](https://github.com/aberman/html2js-brunch).
  * You’ll also find plugins that “statically” compile templates: this is for people who don’t want to have a vanilla HTML static asset, and would rather use an alternative syntax, possibly injecting a *presenter* in there from, say, a JSON file:
      * [`static-jade-brunch`](https://www.npmjs.com/package/static-jade-brunch);
      * [`static-underscore-brunch`](https://www.npmjs.com/package/static-underscore-brunch) (based on Underscore.js’ micro-templating).

## Brunch and development workflows

These days, **web front dev is hard**.  We use a metric ton of different techs, want to debug in a snap, get a super-fast in-browser feedback loop, pay attention to performance, and so on and so forth.

There are many tools to help us get there, but having to manually install, setup and run these individually is a major PITA.  **Brunch can help**, thanks to integration plugins.

**Linters** first:

  * [`eslint-brunch`](https://www.npmjs.com/package/eslint-brunch) for [ESLint](http://eslint.org/) give you ability to lint your JavaScript with tons of new fancy ES201X features.
  * [`jshint-brunch`](https://www.npmjs.com/package/jshint-brunch) of course, that will run [JSHint](http://jshint.com/) with current settings (e.g. coming from `.jshintrc`) on all our applicative codebase (by default, `app`).  This can operate either in warning mode (log but don’t break the build) or error (stop the build).  Runs in watcher mode as well.
  * [`coffeelint-brunch`](https://www.npmjs.com/package/coffeelint-brunch) for [CoffeeLint](http://www.coffeelint.org/), if you’re going with CoffeeScript.
  * [`jsxhint-brunch`](https://www.npmjs.com/package/jsxhint-brunch) for [JSXHint](https://github.com/STRML/JSXHint/), which can run JSHint over JSX without tripping over markup literals.
  * No integration for JSLint, but I sure won’t whine about *that*…

A **fast feedback loop** is a must-have when doing web front dev, that lets us see the result of our CSS or JS tweaks nearly instantly in our open browser(s).  There are a few plugins for this, all designed to run in watcher mode:

  * [`auto-reload-brunch`](https://www.npmjs.com/package/auto-reload-brunch) reacts to any change by live-injecting CSS changes if that’s all there is; it reloads the whole page if JS is involved.  This relies on native Web Sockets, so IE10+.
  * [`browser-sync-brunch`](https://www.npmjs.com/package/browser-sync-brunch) embeds the excellent [BrowserSync](http://www.browsersync.io/), that lets you live inject CSS (no page reload), remote debug pages (embeds Weinre), sync a lot of interactions across open browsers (form filling, scrolling, clicking, etc.).  Super handy to test responsive stuff  *(full disclaimer: I’m one of the maintainers of the plugin).*
  * [`fb-flo-brunch`](https://github.com/deliciousinsights/fb-flo-brunch), by yours truly, transparently embeds the awesome [fb-flo](https://facebook.github.io/fb-flo/), check it out *now*!

**Code documentation** isn’t forgotten either: several integrations let you regenerate docs at build time, to spare you an extra command line.

  * [`jsdoc-brunch`](https://www.npmjs.com/package/jsdoc-brunch) naturally, but also…
  * [`docco-brunch`](https://www.npmjs.com/package/docco-brunch), for [Docco](http://jashkenas.github.io/docco/), the tool that popularized annotated sources.
  * I’d love to see someone contribute `groc-brunch`, because [Groc](http://nevir.github.io/groc/) goes way beyond Docco!

There are also a number of plugins designed to **replace** keywords, markers or translation keys during the build:

  * [`process-env-brunch`](https://www.npmjs.com/package/process-env-brunch) uses environment variables;
  * [`keyword-brunch`](https://www.npmjs.com/package/keyword-brunch) (two variants) uses the global configuration to map keys and switch between its replacement behaviors;
  * [`jspreprocess-brunch`](https://www.npmjs.com/package/jspreprocess-brunch) adds a “C-style” preprocessor (with `#BRUNCH_IF` directives inside comments) that lets you change the resulting code depending on the build target;
  * [`constangular-brunch`](https://www.npmjs.com/package/constangular-brunch), along the same lines, injects YAML-based configurations inside your AngularJS app as a specific module, in an environment-sensitive way (development, production);
  * [`yaml-i18n-brunch`](https://www.npmjs.com/package/yaml-i18n-brunch) is a bit more specialized, and convertsYAML files into JSON, taking care to fill in the blanks in your *locales* from the default *locale* (assumed to be complete).

A few more plugins are worth mentioning:

  * [`dependency-brunch`](https://www.npmjs.com/package/dependency-brunch) lets you tell Brunch about specific dependencies you have between source files, when it doesn’t auto-detect these, so that it triggers proper rebuilds.  For instance, when Jade views extend a layout or include mixins, such dependencies can ensure you only need to change the layout/mixins for views that use them to get rebuilt.
  * [`groundskeeper-brunch`](https://www.npmjs.com/package/groundskeeper-brunch) strips from your JS files anything that could hinder production: `console` calls, `debugger` statements, specific blocks… (if minification is used, it must happen *after* this).
  * [`after-brunch`](https://www.npmjs.com/package/after-brunch) provides a simple way to register command lines for execution after a build, which lets you add custom tasks in a generic way!

## Brunch and web performance

Brunch naturally cares about your performance, so it attempts to produce **assets that are as optimized as possible**, through third-party technologies.  Most of these plugins are irrelevant in watcher mode, but are more targeted at one-shot production builds.

Let’s start with **images**:

  * [`retina-brunch`](https://www.npmjs.com/package/retina-brunch) takes a high-res “Retina” image (one with `@2x` in its name) and creates a lower-res variant for lower-DPI screens;
  * [`sprite-brunch`](https://www.npmjs.com/package/sprite-brunch) relies on [Spritesmith](https://github.com/Ensighten/spritesmith) to produce an *image sprite* and the matching CSS (using SASS, LESS or Stylus) from your source images.  Not as versatile and powerful as Glue, but pretty good still.
  * [`imageoptmizer-brunch`](https://www.npmjs.com/package/imageoptmizer-brunch) (notice the missing central `i`…) runs in production/optimized mode to automatically run your target folder’s images through whatever relevant tools you have installed: [JPEGTran](http://desgeeksetdeslettres.com/programmation-java/jpegtran-un-outil-permettant-doptimiser-les-images-jpeg), [OptiPNG](http://optipng.sourceforge.net/) and [SmushIt](http://imgopt.com/).  For a systematic, express weight reduction.

We certainly have top-notch JS/CSS minifiers, too:

  * [`uglify-js-brunch`](https://www.npmjs.com/package/uglify-js-brunch) uses [UglifyJS 2](https://github.com/mishoo/UglifyJS2) for badass reduction of target JS files;
  * [`clean-css-brunch`](https://www.npmjs.com/package/clean-css-brunch) relies on [CleanCSS](https://github.com/jakubpawlowicz/clean-css), one of the best CSS minifiers out there (and if you want to play with the all-new more-css, feel free to contribute a plugin!).
  * Let’s not forget [`csso-brunch`](https://www.npmjs.com/package/csso-brunch).
  * [`uncss-brunch`](https://www.npmjs.com/package/uncss-brunch) uses the awesome [UnCSS](https://github.com/giakki/uncss) to detect **unused code in our stylesheets**; if you want to combine that with clean-css, you can either use both separately, or go with the [`clean-css-uncss-brunch`](https://www.npmjs.com/package/clean-css-uncss-brunch) combo.

There are also a number of plugins designed to maintain a “fingerprint” on filenames, allowing for **far-expiry caching**, and to GZip your files for static gzipping (e.g. on [nginx](http://nginx.org/en/docs/http/ngx_http_gzip_static_module.html)):

  * [`digest-brunch`](https://www.npmjs.com/package/digest-brunch) computes the fingerprint based on the file’s contents;
  * [`git-digest-brunch`](https://www.npmjs.com/package/git-digest-brunch) and [`hg-digest-brunch`](https://www.npmjs.com/package/hg-digest-brunch) use the current commit’s SHA instead (which assumes you’re committing in a manner consistent with that).
  * [`gzip-brunch`](https://www.npmjs.com/package/gzip-brunch) compresses your finalized CSS/JS assets, either as copies (preferred) or replacements of your original files.

If you’re using AppCache (and until we can all get our hands on `ServiceWorker`, you should!), there are a few useful plugins too:

  * [`appcache-brunch`](https://www.npmjs.com/package/appcache-brunch) maintains an **up-to-date manifest**, complete with the names of all files in the target folder, but also with a unique *digest*, so that **if a source file changes, so does the manifest!** Without that, invalidating the AppCache in dev quickly grows super tedious…
  * In the same spirit, [`brunch-signature`](https://www.npmjs.com/package/brunch-signature) computes a *digest* from produced files and puts it in a static file of your choosing;  you could then, for instance, do a **low-frequency Ajax polling** from your app to detect it’s changed and suggest a refresh.
  * Still along these lines, [`version-brunch`](https://www.npmjs.com/package/version-brunch) auto-maintains a version number for your app, based on the one in your `package.json` but with an extra build number tacked onto it.  It also puts it in a static file (that you can therefore poll), and auto-replaces specific version markers in all your produced files.

Finally, [`cloudfront-brunch`](https://www.npmjs.com/package/cloudfront-brunch) is one of the plugins capable of auto-uploading your **assets to an S3 bucket**, and send the proper invalidation request to CloudFront, to boot.  Sweet.

----

« Previous: [Web server: built-in or custom](chapter10-web-server.md) • Next: [Writing a Brunch plugin](chapter12-writing-a-plugin.md) »
