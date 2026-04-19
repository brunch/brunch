# Watcher

This is part of [The Brunch.io Guide](../../README.md).

So far in this guide, we’ve manually rebuilt every time we needed to.  Sure, it’s fast, but still.  In real life, we’d much rather have a watcher keep an eye on our source code and update the build on the fly, as fast as possible.

This is something **Brunch rocks at**.  It comes with a built-in incremental watcher that is **super fast**.  Instead of running a one-shot `brunch build` every fifteen seconds, just go with a `brunch watch`.  Then make a few changes to your files, saving as you go.  Here’s what it looks like on our demo:

```sh
$ brunch watch    # Or brunch w, for the lazy…
26 Feb 16:46:42 - info: compiled 3 files into 3 files, copied index.html in 304ms
26 Feb 16:47:01 - info: compiled application.js into app.js in 69ms
26 Feb 16:47:10 - info: copied index.html in 72ms
26 Feb 16:47:14 - info: compiled main.scss into app.css in 71ms
```

Brunch has made significant changes in 1.7.0 and then again in 1.8.0 to its internal watcher engine, `chokidar`, and now uses a **minimal check interval** to lighten the load even more.  By default, this interval is **65ms**.  If I wanted to be aggressive about it, I could set `fileListInterval` to `20`, for instance, and get this:

```sh
26 Feb 16:49:31 - info: compiled 3 files into 3 files, copied index.html in 266ms
26 Feb 16:49:36 - info: compiled application.js into app.js in 26ms
26 Feb 16:49:43 - info: copied index.html in 25ms
26 Feb 16:49:44 - info: compiled main.scss into app.css in 26ms
```

But 65ms is pretty fast already, so I generally stay with it :smile:.

You may think that it’s fast right now because of how ridiculously small our demo is (although Grunt or Gulp would happily take 1,000 to 2,000ms already).  Alright, let’s try with one of my JS training class codebases:

```text
app
├── application.js
├── assets
│   ├── apple-touch-icon-114x114.png
│   ├── apple-touch-icon-120x120.png
│   ├── apple-touch-icon-144x144.png
│   ├── apple-touch-icon-57x57.png
│   ├── apple-touch-icon-60x60.png
│   ├── apple-touch-icon-72x72.png
│   ├── apple-touch-icon-76x76.png
│   ├── apple-touch-icon-precomposed.png
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-196x196.png
│   ├── favicon-32x32.png
│   ├── favicon-96x96.png
│   ├── favicon.ico
│   ├── fonts
│   │   ├── glyphicons-halflings-regular.eot
│   │   ├── glyphicons-halflings-regular.svg
│   │   ├── glyphicons-halflings-regular.ttf
│   │   └── glyphicons-halflings-regular.woff
│   ├── images
│   │   └── spinner.gif
│   ├── index.html
│   ├── mstile-144x144.png
│   ├── mstile-150x150.png
│   ├── mstile-310x150.png
│   ├── mstile-310x310.png
│   └── mstile-70x70.png
├── bootstrap.js
├── externals
│   ├── backbone-1.0.0.js
│   ├── backbone-mediator.js
│   ├── backbone-stickit-0.8.0.js
│   ├── bootstrap
│   │   ├── collapse.js
│   │   ├── modal.js
│   │   ├── tooltip.js
│   │   └── transition.js
│   ├── console-helper.js
│   ├── jquery-1.10.2.js
│   ├── lawnchair-dom.js
│   ├── lawnchair.js
│   ├── moment-2.2.1-fr.js
│   ├── socket.io.js
│   └── underscore-1.6.0.js
├── initialize.js
├── lib
│   ├── appcache.js
│   ├── connectivity.js
│   ├── location.js
│   ├── notifications.js
│   ├── persistence.js
│   ├── places.js
│   ├── router.js
│   └── view_helper.js
├── models
│   ├── check_in.js
│   ├── check_in_ux.js
│   └── collection.js
├── styles
│   ├── check_in.styl
│   ├── history.styl
│   ├── main.styl
│   └── places.styl
└── views
    ├── check_in_details_view.js
    ├── check_in_view.js
    ├── history_view.js
    ├── home_view.js
    ├── templates
    │   ├── _layout.jade
    │   ├── _mixins.jade
    │   ├── check_in.jade
    │   ├── check_in_details.jade
    │   ├── check_ins.jade
    │   ├── history.jade
    │   ├── home.jade
    │   └── places.jade
    └── view.js
vendor
└── styles
    └── bootstrap
        ├── _alerts.less
        ├── _badges.less
        ├── _breadcrumbs.less
        ├── _button-groups.less
        ├── _buttons.less
        ├── _carousel.less
        ├── _close.less
        ├── _code.less
        ├── _component-animations.less
        ├── _dropdowns.less
        ├── _forms.less
        ├── _glyphicons.less
        ├── _grid.less
        ├── _input-groups.less
        ├── _jumbotron.less
        ├── _labels.less
        ├── _list-group.less
        ├── _media.less
        ├── _mixins.less
        ├── _modals.less
        ├── _navbar.less
        ├── _navs.less
        ├── _normalize.less
        ├── _pager.less
        ├── _pagination.less
        ├── _panels.less
        ├── _popovers.less
        ├── _print.less
        ├── _progress-bars.less
        ├── _responsive-utilities.less
        ├── _scaffolding.less
        ├── _tables.less
        ├── _theme.less
        ├── _thumbnails.less
        ├── _tooltip.less
        ├── _type.less
        ├── _utilities.less
        ├── _variables.less
        ├── _wells.less
        └── bootstrap.less
```

Aaaaah, I don’t hear you dissing the codebase size anymore, do I? :wink:  Let’s see what this runs like, even at the default 65ms interval:

```sh
$ brunch watch
… 16:54:10 - info: compiled 46 files and 1 cached into 2 files, copied 25 in 1246ms
… 16:54:37 - info: compiled application.js and 41 cached files into app.js in 255ms
… 16:54:45 - info: compiled history.styl and 4 cached files into app.css in 157ms
… 16:55:03 - info: copied index.html in 67ms
```

So yeah, for JS and CSS builds, we went “overboard” to an average 200ms, but that’s mostly because we embed many Jade templates and heavy CSS (all of Bootstrap 3), and some of these transpilers are a mite slow.  The resulting files are not so small anymore, too:

```sh
$ ls -lah public/*.{js,css}
-rw-r--r-- 1 tdd staff 119K fév 26 16:54 public/app.css
-rw-r--r-- 1 tdd staff 709K fév 26 16:54 public/app.js
```

Say, that’d be a good time to try out production mode on this other repo, with **minification**:

```sh
$ brunch build --production # or brunch b -P, if you like it unreadable
…
$ ls -lah public/*.{js,css}
-rw-r--r-- 1 tdd staff  97K fév 26 16:57 public/app.css
-rw-r--r-- 1 tdd staff 252K fév 26 16:57 public/app.js
```

Aaaah, [much better](https://www.youtube.com/watch?v=mvwd13F_1Gs).

Be careful though, `chokidar` (in Brunch 1.7.x) seemed to sometimes have trouble on Windows with detecting new files, occasionally even changes to known files.  I’ve also seen it happen a couple times on Linux or even OSX.  This should go away starting with 1.8.0, but in the meantime, I find switching `watcher.usePolling` to `true` alleviates most of this issue.

----

« Previous: [Production builds](chapter08-production-builds.md) • Next: [Web server: built-in or custom](chapter10-web-server.md) »
