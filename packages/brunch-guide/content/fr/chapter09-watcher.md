# *Watcher*

Ceci fait partie du [Guide de Brunch.io](README.md).

Depuis le début de ce guide, on rebuilde manuellement à chaque fois.  D'accord, ça va vite, mais quand même.  Dans la vraie vie, on préfère avoir un *watcher* qui surveille notre codebase source et met à jour, le plus vite possible, notre build.

C'est là quelque chose où **Brunch excelle**.  Il incorpore de base un *watcher* incrémental **très performant**.  Au lieu de lancer `brunch build` toutes les quinze secondes, lancez une seule fois `brunch watch`.  Puis faites quelques modifs à vos fichiers et sauvez à chaque fois.  Voyez ce à quoi ça ressemble pour notre démo :

```sh
$ brunch watch    # Ou brunch w, pour les flemmasses
26 Feb 16:46:42 - info: compiled 3 files into 3 files, copied index.html in 304ms
26 Feb 16:47:01 - info: compiled application.js into app.js in 69ms
26 Feb 16:47:10 - info: copied index.html in 72ms
26 Feb 16:47:14 - info: compiled main.scss into app.css in 71ms
```

Brunch a modifié vers sa version 1.7.0, et à nouveau dans sa 1.8.0, la couche de surveillance interne : `chokidar`.  Elle utilise désormais un **intervalle de vérification minimal** pour réduire la charge, et cet intervalle est par défaut à **65ms**.  Si je voulais la jouer agressif et réglais `fileListInterval` à `20`, par exemple, ça donnerait ça :

```sh
$ brunch watch
26 Feb 16:49:31 - info: compiled 3 files into 3 files, copied index.html in 266ms
26 Feb 16:49:36 - info: compiled application.js into app.js in 26ms
26 Feb 16:49:43 - info: copied index.html in 25ms
26 Feb 16:49:44 - info: compiled main.scss into app.css in 26ms
```

Mais en vrai, 65ms, c'est très raisonnable, hein… :smile:

Vous vous dites peut-être que là, notre codebase est ridicule, c'est normal que ça aille si vite (même si Grunt et Gulp seraient déjà allègrement à 1000 voire 2000ms).  Okay, prenons la codebase d'exemple de notre formation [JS Total](http://www.js-attitude.fr/js-total/) :

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

Aaaah, on fait moins les malins là, hein !? :wink:  Eh bah, voyez ce que ça donne (intervalle par défaut à 65ms) :

```sh
$ brunch watch
… 16:54:10 - info: compiled 46 files and 1 cached into 2 files, copied 25 in 1246ms
… 16:54:37 - info: compiled application.js and 41 cached files into app.js in 255ms
… 16:54:45 - info: compiled history.styl and 4 cached files into app.css in 157ms
… 16:55:03 - info: copied index.html in 67ms
```

Alors oui, pour les builds JS et CSS, on est passés à « carrément » 200ms en moyenne, mais c'est surtout parce qu’on a plein de templates Jade et du CSS lourd (tout Bootstrap 3), et certains *transpilers* sont un poil lents, voire synchrones…  On remarque au passage que les fichiers résultats ne sont plus si petits que ça, forcément :

```sh
$ ls -lah public/*.{js,css}
-rw-r--r-- 1 tdd staff 119K fév 26 16:54 public/app.css
-rw-r--r-- 1 tdd staff 709K fév 26 16:54 public/app.js
```

Tiens, profitons-en pour tester la **minification** :

```sh
$ brunch build --production
…
$ ls -lah public/*.{js,css}
-rw-r--r-- 1 tdd staff  97K fév 26 16:57 public/app.css
-rw-r--r-- 1 tdd staff 252K fév 26 16:57 public/app.js
```

Aaaah, *[much better](https://www.youtube.com/watch?v=mvwd13F_1Gs)*.

Attention, il arrive hélas fréquemment sur Windows (notamment depuis cette mise à jour de `chokidar` en 1.7.0, que j'ai évoquée plus haut) que les nouveaux fichiers soient mal détectés, voire que certaines modifs passent à la trappe.  Plus rarement, je l'ai vu arriver sur Linux voire OSX.  Il semble qu'activer le réglage `watcher.usePolling` (à `true`, donc) résolve la majorité de ces problèmes (mais pas tous…).  La 1.8.0 devrait avoir considérablement amélioré ça…

----

« Précédent : [Builds de développement et de production](chapter08-production-builds.md) • Suivant : [Serveur web, intégré ou personnalisé](chapter10-web-server.md) »
