# Brunch?!  What’s Brunch?

This is part of [The Brunch.io Guide](../../README.md). Replace gulp / grunt and increase your dev speed.

![](http://brunch.io/images/svg/png/brunch-logo-napkin.png)

[Brunch](http://brunch.io/) is a **builder**.  Not a generic task runner, but a specialized tool focusing on the production of a small number of deployment-ready files from a large number of heterogenous development files or trees.

This is an **extremely common need among front-end developers** (or front-end designers, for that matter), who most often have the same set of needs: take a tree of LESS/SASS files to produce a small set of minified CSS files, same for JS, same for sprited images, etc.

## Brunch vs. others

The vast majority of automation tool users use either [Grunt](http://gruntjs.com/) or [Gulp](http://gulpjs.com/) (much more rarely [Broccoli](https://github.com/broccolijs/broccoli)).  Although extremely popular, these got on the market later than Brunch did, and are often inferior for common use-cases.

I’ve been using Brunch since June 2012 (around version 1.3; it dates back all the way to Spring 2011) and to this day, it’s proved—for me—to be **vastly superior** to later actors in the field.

In order to properly understand what sets Brunch apart from other such tools, this chapter dives into several technical and architectural aspects, that are as many design choices that you can categorize this ecosystem with.

Once we have a firm grasp of this, we’ll move on to tons of concrete code, demos and tutorials, have no fear :wink:.

## Task runners vs. builders

The market is dominated by **generic task runners**.  These tools provide a mechanism for describing tasks, and dependencies between tasks.  These tasks can be anything: copy a file, write a file, send an e-mail, compile something, run tests, do a Git commit… absolutely anything you can think of.

This is a very old concept; one of the first well-known generic task runners was the venerable [Make](http://www.gnu.org/software/make/) (and its famous `Makefile`); in the Java world, we first had [Ant](http://ant.apache.org/), then as if that wasn’t verbose enough already, we now have the friggin’ [Maven](http://maven.apache.org/) wooly mammoth; Ruby has [Rake](http://docs.seattlerb.org/rake/), and so on and so forth.

Because these runners are generic, they seldom can automatically optimize for specific scenarios, or even define useful default conventions.  Any task requires writing a non-trivial volume of code and/or configuration, and must be explicitly invoked in all the right places.

Furthermore, any task—and even any background processing, such as watching files to update the build—requires writing a plugin, loading it, configuring it, and so on.

**Brunch is a build tool.**

Brunch is **fundamentally** specialized and geared towards **building assets**, these files that get used in the end by your runtime platform, usually a web browser.  It thus comes pre-equipped with a number of behaviors and features.  You’ll most notably get:

  * Categorization of source files: JavaScript, Style sheets, Templates and “miscellanea”;
  * **Smart concatenation** of these files towards one or more target files;
  * **Module wrapping** of JavaScript files;
  * Handling of front-end dependencies with NPM;
  * Maintenance of all relevant [source maps](http://blog.teamtreehouse.com/introduction-source-maps);
  * **Minification** of resulting files if we’re in “production mode”;
  * **Watching** of source files to update the build on the fly.

All these features are here already because this is a specialized tool, yet they remain **super-easy to use** (most of the time, they’re actually automatic) thanks to a nifty set of conventions, that we’ll explore later on.

## File-based processing vs. pipelines

**Grunt shares the same key weakness** as Make, Ant or Maven, that inspired it: it relies entirely on files as units of work.  Just about any task gets files in and puts files out.

This approach is **severely limiting** for a number of very common workflows, where the change of a unique file impacts multiple targets, such as a concatenation, the matching sourcemap, an AppCache manifest, etc.  With Grunt, you spend most of your time dealing with temporary files for intermediate processing steps, which is a *horrifying mess*.

The other main drawback of this approach is that [it’s slow as a procrastinating slug](https://www.google.fr/webhp?sourceid=chrome-instant&ion=1&espv=2&ie=UTF-8#q=why%20is%20grunt%20so%20slow): you spend most of your time opening the same source files again, reading them all over again, and this for just a single build pass.

The alternative is the pipeline: you sort of connect files together across a number of processing steps, defining dependencies, and when a file changes, its new content gets read only once and piped down any number of processing avenues, be they sequential or parallel.

This is the fundamental approach of Gulp, Broccoli, and obviously Brunch.

**Brunch is a pipeline.**

But all pipelines are not equal, and their performance varies wildly.  In fact, **Gulp remains atrociously slow** for a comfortable “watcher” use, when Brunch can be **incredibly fast**.

## Configuration and boilerplate vs. conventions

As with most tool categories, you’ll get two approaches: the one based on code and configuration on the one hand, and that based on conventions on the other hand.

The first approach has the advantage of being explicit, devoid of any “magic”, at the cost of an often distasteful verbosity that hinders productivity, and adds a ton of [boilerplate](http://gruntjs.com/sample-gruntfile): the same segments of code that get copy-pasted on new projects over and over again, drowning the core semantics.

The convention-based approach trims down the required code or configuration to whatever “strays from the established path,” a path crystallized by the tool’s elected conventions.  Follow these, and you’ll have next to nothing to write or customize; get custom, and you’ll have to write code or use settings for your specific needs.

The advantage is clear: **brevity and expressiveness** of your content that doesn’t include anything superfluous.  The drawback: it can feel a bit like “black-box magic”.

**Brunch relies on solid conventions, reducing your configuration needs to the bare minimum.**

This is a well-established architectural choice known as **Convention Over Configuration** (CoC), and is at the core of such esteemed projects as Ruby on Rails or Ember.js.  And Brunch.

## Full builds vs. incremental builds

The majority of task runners or builders operate along one of two modes: the **one-shot build** and the **watcher**.  In this second mode, the tool creates the initial build, then watches over all relevant source files and trees, looking for changes: these trigger an update of the build.

This update can itself operate along one of two modes: either it **rebuilds everything** from scratch (which requires no particular knowledge of the semantics of the tasks involved), or it **only reruns the necessary build steps** based on the detected changes, which greatly reduces the required work.

This second way is obviously preferable in terms of performance, as it can turn a 2-second build into a 0.2-second one, or even a 50-second build into a 0.5-second one.  But to achieve this, you need a fine-grained understanding of task semantics and dependencies, a pipeline, and a caching mechanism for all your processing steps.  This is referred to as an **incremental build** system.

I only recently realized, flabbergasted, that neither Grunt nor Gulp operate like this; although [plugins](https://github.com/wearefractal/gulp-cached) [exist](https://github.com/ahaurw01/gulp-remember), from everything I‘ve read online or heard live, they’re pretty tough to set up properly, and the best results they get are often rather sub-optimal.

**Brunch uses incremental builds.**

In my humble opinion, this is the only worthy approach; without it, watcher performance is dismal, far too low to be really useful throughout your day.  It is so obvious to me that it had not even occurred to me that Grunt and Gulp didn’t work this way.

Brunch has always done so, naturally.

## The paramount importance of speed

You likely noticed that across all the previous points, speed was a recurring concern.  There’s a good reason for this.

To really be useful, to actually provide us with operational comfort regardless of the amount, size and type of source files we have (JS, CoffeeScript, TypeScript, ES6 or even ES7, React, LESS, SASS, Stylus, Handlebars, Jade, Dust or what have you…) and still let us see the results of our changes in our browsers hundreds of times a day, our watcher must update the build **fast**.

And by “fast” I mean **under 300ms**, even for super-heavy use cases.  Actually for simple, tutorial-level use cases, this should probably not exceed 100ms (minimum standard User Interface Design time for visual changes).

This might sound excessive, but as soon as you’re slower than that and reach 2, 3 or even 10 seconds, as is far too often the case with Grunt or Gulp, what do you get?  Developers and designers who spend more time checking their tool’s console after each file save than looking at the result of their change in the browser.

The wonders of hot-swapping and live injection of CSS or JS in an open browser page **are useless** if you must first wait several seconds for the build to update.  Even a good ol’ `Alt+Tab` followed by a keyboard-based Refresh quickly trips over itself if it must first wait a while.  The feedback loop crumbles; its transmission belt gets stuck.

**Brunch is insanely fast.**

If you want to see for yourself what an **efficient feedback loop** looks like, check out [this segment](http://youtu.be/2Dl9ES6IC3c?t=26m55s) of my (French-language) screencast “Dev-Avengers for the front-end web.”  I just need to watch the looks in the audience’s eyes when I showcase this stuff to feel how *hungry* front-end devs are for this.

## Then why do I only ever hear about the others?

In a word?  **Marketing.**  *(OK, and perhaps docs too, to some extent.)*

**Grunt** was the first to really get noticed (starting in the second semester of 2012), and its popularity soared again when it got selected as the build tool for the Angular ecosystem; it **peaked by late 2013**, at which time Gulp started eating its lunch.

Broccoli remains on the fringe, even if it occasionally gets some spotlight.

And Brunch?  Brunch never made the news much.  It’s alive and kickin’, has an **extremely loyal user base**, and just about anyone I show it to switches quite quickly to it: after 3+ years of teaching advanced JS and front-end dev or Node.js, this is still the first thing my trainees apply back at work on the next Monday :smile:.  And every time I present on [Dev Avengers](https://www.youtube.com/watch?v=2Dl9ES6IC3c), people ogle…

Still, Brunch remains discreet.  With 5,100 GitHub stars (48% of Grunt’s), 360+ forks and 5+ years of active existence, it’s no small project, it’s just… discreet.

That being said, it looks like 2014 was a renaissance year for Brunch, as developer mindshare goes.  [Various](http://alxhill.com/blog/articles/brunch-coffeescript-angular/) [articles](http://blog.jetbrains.com/webstorm/2014/06/the-brunch-build-tool/) got published. 3 years after its birth, people seemed to suddenly realize Brunch was there.  To wit:

<blockquote class="twitter-tweet" lang="fr"><p>Brunch is an ultra-fast HTML5 build tool <a href="http://t.co/jDhHaPPN2J">http://t.co/jDhHaPPN2J</a></p>&mdash; Christian Heilmann (@codepo8) <a href="https://twitter.com/codepo8/status/513779957584371712">September 21, 2014</a></blockquote>

<blockquote class="twitter-tweet" data-conversation="none" data-cards="hidden" data-partner="tweetdeck"><p><a href="https://twitter.com/tomdale">@tomdale</a> skip the task runners and messy config files. plug-in based build tools ftw. <a href="http://t.co/6U0XV1GYMB">http://t.co/6U0XV1GYMB</a></p>&mdash; Josh Habdas (@jhabdas) <a href="https://twitter.com/jhabdas/status/535878760097398784">November 21, 2014</a></blockquote>

<blockquote class="twitter-tweet" data-conversation="none" data-cards="hidden" data-partner="tweetdeck"><p><a href="https://twitter.com/Ken_Stanley">@Ken_Stanley</a> Just discovered brunch.io today too which makes life even easier.</p>&mdash; Hugh Durkin (@hughdurkin) <a href="https://twitter.com/hughdurkin/status/553993540070830080">January 10, 2015</a></blockquote>

So there’s a hope!

Personally, I’ve been using Brunch on absolutely every front build I do, from the tiny personal project to the corporate mammoth, ever since 2012. And **it’s still an absolute joy**.

With this guide, I’m trying to give you a comprehensive understanding of the power of Brunch; I hope this will tease you into trying it out on your next projects, big or small.  And if you come from a Grunt or Gulp background, especially on complex build needs, prepare to be amazed :smile:.

Now let’s move on to chapter 2!

« Previous: [Table of contents](https://github.com/brunch/brunch-guide/blob/master/README.md) • Next: [Getting started with Brunch](chapter02-getting-started.md) »
