# The Brunch.io Guide

![](http://brunch.io/images/svg/png/brunch-logo-napkin.png)

This is an attempt at a comprehensive guide to [Brunch](http://brunch.io/), an excellent builder for browser apps that gives Grunt, Gulp, Broccoli et al. a run for their money.  I adapted this from [my (French language) article from early March 2015](http://www.js-attitude.fr/2015/03/04/brunch-mon-builder-prefere/).

Is your English reading not so good? Check out our [translations](#translations).

For a short 8-minute version that allows to learn 90% of Brunch features take a look at Brunches [official micro guide](http://brunch.io/docs/getting-started).

## Table of Contents

1. [Brunch?! What’s Brunch?](content/en/chapter01-whats-brunch.md)
  * [Brunch vs. others](content/en/chapter01-whats-brunch.md#brunch-vs-others)
  * [Task runners vs. builders](content/en/chapter01-whats-brunch.md#task-runners-vs-builders)
  * [File-based processing vs. pipelines](content/en/chapter01-whats-brunch.md#file-based-processing-vs-pipelines)
  * [Configuration and boilerplate vs. conventions](content/en/chapter01-whats-brunch.md#configuration-and-boilerplate-vs-conventions)
  * [Full builds vs. incremental builds](content/en/chapter01-whats-brunch.md#full-builds-vs-incremental-builds)
  * [The paramount importance of speed](content/en/chapter01-whats-brunch.md#the-paramount-importance-of-speed)
  * [Then why do I only ever hear about the others?](content/en/chapter01-whats-brunch.md#then-why-do-i-only-ever-hear-about-the-others)
2. [Getting started with Brunch](content/en/chapter02-getting-started.md)
  * [Should I use a skeleton?](content/en/chapter02-getting-started.md#should-i-use-a-skeleton)
3. [Conventions and defaults](content/en/chapter03-conventions-and-defaults.md)
  * [Built-in processing](content/en/chapter03-conventions-and-defaults.md#build-in-processing)
  * [Configuration files](content/en/chapter03-conventions-and-defaults.md#configuration-files)
  * [Folders](content/en/chapter03-conventions-and-defaults.md#folders)
  * [CommonJS module wrapping](content/en/chapter03-conventions-and-defaults.md#commonjs-module-wrapping)
  * [Sourcemaps](content/en/chapter03-conventions-and-defaults.md#sourcemaps)
  * [Watcher](content/en/chapter03-conventions-and-defaults.md#watcher)
  * [Built-in web server](content/en/chapter03-conventions-and-defaults.md#built-in-web-server)
  * [Plugin loading](content/en/chapter03-conventions-and-defaults.md#plugin-loading)
4. [Starting from scratch](content/en/chapter04-starting-from-scratch.md)
  * [How about a shortcut?](content/en/chapter04-starting-from-scratch.md#how-about-a-shortcut)
  * [Just a couple files](content/en/chapter04-starting-from-scratch.md#just-a-couple-files)
  * [Installing a starting set of Brunch modules](content/en/chapter04-starting-from-scratch.md#installing-a-starting-set-of-brunch-modules)
  * [Our first build](content/en/chapter04-starting-from-scratch.md#our-first-build)
  * [Globals; because, reasons.](content/en/chapter04-starting-from-scratch.md#globals-because-reasons)
  * [Getting modular again](content/en/chapter04-starting-from-scratch.md#getting-modular-again)
  * [Split targets](content/en/chapter04-starting-from-scratch.md#split-targets)
5. [Using third-party module registries](content/en/chapter05-using-third-party-registries.md)
6. [A shot at templating](content/en/chapter06-a-shot-at-templating.md)
7. [Using Brunch on a legacy codebase](content/en/chapter07-using-brunch-on-legacy-code.md)
8. [Production builds](content/en/chapter08-production-builds.md)
9. [Watcher](content/en/chapter09-watcher.md)
10. [Web server: built-in or custom](content/en/chapter10-web-server.md)
  * [Writing your own server](content/en/chapter10-web-server.md#writing-your-own-server)
  * [And not just Node, either…](content/en/chapter10-web-server.md#and-not-just-node-either)
11. [Plugins for all your build needs](content/en/chapter11-plugins.md)
  * [Enabling a plugin](content/en/chapter11-plugins.md#enabling-a-plugin)
  * [Fine-tuning through optional configuration](content/en/chapter11-plugins.md#fine-tuning-through-optional-configuration)
  * [Brunch and CSS](content/en/chapter11-plugins.md#brunch-and-css)
  * [Brunch and JavaScript](content/en/chapter11-plugins.md#brunch-and-javascript)
  * [Brunch and templates](content/en/chapter11-plugins.md#brunch-and-templates)
  * [Brunch and development workflows](content/en/chapter11-plugins.md#brunch-and-development-workflows)
  * [Brunch and web performance](content/en/chapter11-plugins.md#brunch-and-web-performance)
12. [Writing a Brunch plugin](content/en/chapter12-writing-a-plugin.md)
13. [Conclusion](content/en/chapter13-conclusion.md)

## Translations

This guide is also available in the following languages:

  * [French](content/fr/README.md)

To contribute translations, check out our [guidelines](CONTRIBUTING.md).

## Brunch version

This guide was written against Brunch 2.5.  Most of it works in earlier versions, though; still, you should upgrade!

## License

This work is © 2015 Christophe Porteneuve, licensed under [the MIT license](LICENSE).

## Contributing

I welcome all useful contributions: typos, bug fixes, rephrasings, better explanations or examples, extra information and demos, translations, etc.

Be sure to check our [contribution guidelines](CONTRIBUTING.md)!

## Acknowledgments

The [Brunch team](https://github.com/orgs/brunch/people) deserves enormous applause and thanks for their amazing work on this tool.  I write this as Brunch turns 4 already, and it's made my life easier (and that of hundreds of my JS trainees) for all that time!  You guys rule!
