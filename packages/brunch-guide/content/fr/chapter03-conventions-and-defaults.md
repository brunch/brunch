# Conventions et valeurs par défaut

Ceci fait partie du [Guide de Brunch.io](README.md).

Les [docs officielles](https://github.com/brunch/brunch/tree/master/docs) expliquent bien les bases et conventions pré-établies.  La quasi-totalité peut être modifiée en configuration, pour s'adapter à vos besoins spécifiques d'architecture.

Gardez donc à l'esprit que ce que je décris dans cette section constitue le fonctionnement **par défaut**, mais pas une obligation.  Ceci dit, plus vous suivrez ces conventions, moins vous aurez de code/configuration à créer et maintenir pour bénéficier des services de Brunch.

Je vous préciserai à chaque fois, de façon succincte, les éléments de ligne de commande ou de configuration qui permettent de quitter ces conventions ; pour tous les détails, [cette page est votre amie](http://brunch.io/docs/config).

## Traitements prédéfinis

Brunch va s'occuper en tous les cas de :

  * **Concaténer** les fichiers, par catégorie, vers une ou plusieurs destinations que vous définissez ;
  * **Déposer** les résultats dans un dossier cible, accompagnés de fichiers et répertoires **statiques** que vous auriez posés au bon endroit source ;
  * **Enrober** ceux de vos JS sources qui le prévoient en **modules CommonJS** (pendant la phase de concaténation) ;
  * Produire les **source maps** nécessaires pour pouvoir déboguer dans votre navigateur sur base des contenus d'origine, non des concaténations ;
  * **Surveiller** vos fichiers et dossiers sources pour réaliser une mise à jour incrémentale du build à la moindre modification (si vous le lancez en mode surveillance plutôt qu'en build unique) ;
  * Fournir un **serveur HTTP** statique mais malin pour vos fichiers (si vous lui demandez).

La nature exacte des fichiers concaténés dépend des **plugins installés**, en revanche.  Voyons déjà ces aspects « par défaut » un peu plus en détail.

## Fichiers de configuration

Brunch va rechercher son fichier de configuration parmi les noms suivants, dans cet ordre :

  * **`brunch-config.js`**
  * `brunch-config.coffee`

On note une préférence pour CoffeeScript (Brunch est écrit en CoffeeScript, et transpilé en JS à chaque release) ; historiquement, il cherchait des fichiers `config.*`, mais c'est vite devenu un peu trop générique, donc il préfère désormais le nom spécifique.

Si vous ne connaissez pas CoffeeScript, **ne paniquez pas** : la quasi-totalité du temps, vous n'aurez qu'un gros objet (type JSON) à y mettre, et CoffeeScript vous épargnera « juste » le bruit des accolades, virgules et guillemets.  On dirait du YAML, c'est tout propre et concis :-)

*Personnalisation : une option de ligne de commande vous permettait d’indiquer le fichier de configuration, mais elle a été dépréciée au profit d’un fichier unique avec des ajustements par environnement, une technique que nous illustrerons dans un chapitre ultérieur.*

## Dossiers

Brunch fait par défaut attention aux dossiers suivants :

  * `app` contient toute la **partie source**, à l'exception des fichiers JS fournis par des tiers et non conçus pour être enrobés en modules.  On y trouverait donc, dans les sous-dossiers de votre choix (ou à même `app`), des fichiers scripts, feuilles de style, et fichiers templates.
  * Tout dossier `assets` (généralement juste `app/assets`) verra son contenu **copié-collé** (récursivement) dans le dossier cible, tel quel, **sans aucun traitement**.
  * Tout dossier `vendor` (généralement à côté du dossier `app`) sera concaténé comme `app`, à un gros détail près : les fichiers scripts ne seront **pas enrobés en modules**.  On y met donc généralement les bibliothèques tierces 100% front qui n'auraient pas de chargeur intégré type UMD, ou simplement que notre code utilise encore (pour le moment ;-)) comme un bon vieux global, au lieu de faire des `require(…)`.
  * Tout fichier démarrant par un *underscore* (`_`) est considéré comme un fichier partiel, inclus par un autre, et ne sera pas utilisé de façon autonome.
  * `public` est le **dossier cible** par défaut.  On retrouve là la convention de nombre de micro-serveurs type [Rack](http://rack.github.io/) et consorts.

Les dossiers `app`, `vendor` et `public` sont exprimés en relatif vis-à-vis du fichier de configuration de Brunch.

*Personnalisation : les chemins sources sont modifiables avec un tableau de noms/chemins dans le réglage `paths.watched`.  Le dossier cible est défini par `paths.public`.  Les chemins à traitement spécial sont définis par `conventions.assets` et `conventions.vendor` (regex ou fonctions).  Les fichiers à ignorer sont définis par `conventions.ignored`.*

## Enrobage CommonJS

Les modules, **c'est le bien**.  Si vous en êtes encore à empiler les globales sans dépendances formelles, il est **plus que temps de rattraper le train…**  Voilà **six ans** qu'on prêche les modules, il y a même eu une espèce de guerre des formats qui a abouti aux **[modules natifs dans ES6](http://jsmodules.io/)**, lesquels [ressemblent davantage](http://jsmodules.io/cjs.html) au format **CommonJS** couramment utilisé par Node.js qu'à ce bon vieux AMD, qui est en nette perte de vitesse…

Les signes ne trompent pas : d'un côté, le passage aux modules ES6 natifs pour des **projets ambitieux** comme [Ember 2](http://www.ember-cli.com/using-modules/) et [Angular 2](https://www.airpair.com/angularjs/posts/preparing-for-the-future-of-angularjs#3-4-transition-to-es6-modules), de l'autre le succès phénoménal du [JS isomorphique](http://isomorphic.net/) et d’outils comme [Browserify](http://browserify.org/), qui packagent du code « façon Node » (et même quelques modules Node.js noyau) pour une exécution dans le navigateur.

Par défaut, Brunch enrobe tous vos fichiers scripts qui ne sont pas à l'intérieur d'un dossier `vendor` comme des **modules CommonJS** : vous y êtes donc dans une *closure* (toutes vos déclarations explicites, et notamment `var` et `function`, sont donc privées), vous avez le droit (je dirais même le devoir !) d'y coller un bon gros `"use strict";` en tête de fichier sans craindre de casser des scripts tiers, et vous avez accès à `exports`, `module.exports` et `require()`.

*Personnalisation : `modules.wrapper` et `modules.definition` définissent le type d'enrobage (sachant qu'on peut désactiver l'enrobage, point barre), tandis que `modules.nameCleaner` construit les noms des modules à partir des chemins des fichiers.*

## Sourcemaps

Toute concaténation, minification ou autre forme de traitement entre les fichiers sources et les productions déposées dans le dossier cible fait l'objet d'un suivi de débogage par *source map*.

Chaque fichier cible est accompagné d'une *source map* v3 multi-niveaux qui permettra aux outils de développement du navigateur (entre autres) **d'afficher et de déboguer les fichiers sources en tout début de chaîne de build**, et non les fichiers cibles réellement utilisés par la plate-forme.

Indispensable pour un débogage sain.

*Personnalisation : le réglage `sourceMaps` peut désactiver, ou modifier, la génération des source maps.  Mais quelle drôle d'idée !*

## Surveillance des sources

Brunch est, de base, capable de surveiller vos fichiers et dossiers sources pour, en cas de modification, **mettre automatiquement à jour les fichiers produits**.  Cette mise à jour est **incrémentale et très performante**.  Brunch affiche un message détaillé sur les fichiers sources détectés, les fichiers finaux mis à jour, et le temps que ça a pris.

Remarquez toutefois que cette surveillance n'est pas toujours parfaitement fiable sur Windows, et plus rarement Linux ou OSX (en tout cas jusqu'en 1.7.20 ; les 1.8+ devraient avoir amélioré les choses).  Certains réglages permettent de réduire ces faux-pas éventuels à presque rien, nous y reviendrons.

Cette surveillance a lieu en utilisant la commande `brunch watch` plutôt que le simple `brunch build`.

Au passage, il est également possible d'être **notifié** lors d'une erreur (par défaut) ou d'autres niveaux (avertissement, info), pour ne même pas avoir à regarder le terminal.  Cela nécessitera toutefois quelques installations qui varient suivant votre système.

Sur OSX, vous devrez installer `terminal-notifier`, qui est distrbué sous forme d’une gemme Ruby.  Tapez simplement la commande suivante dans votre terminal :

```sh
$ sudo gem install terminal-notifier
```

Sur Ubuntu, vous aurez besoin d’installer la commande `notify-send`, qui est distribuée dans le paquet `libnotify-bin`, donc la commande serait la suivante :

```sh
$ sudo apt-get install libnotify-bin
```

Sur Windows, vous devrez installer [Growl for Windows](http://www.growlforwindows.com/gfw/default.aspx), puis télécharger [`growlnotify`](http://www.growlforwindows.com/gfw/help/growlnotify.aspx) et mettre son fichier exécutable quelque part dans votre PATH.

Dans tous les cas, vous pourrez vérifier que tout fonctionne en installant le module npm `growl` et en exécutant un petit bout de code :

```sh
$ npm install growl
$ node -e "require('growl')('Oh le joli test')"
```

Ces instructions sont à jour début avril 2015, mais si elles échouent, vérifiez la documentation du [module npm growl](https://www.npmjs.com/package/growl), utilisé en interne pour fournir les notifications.

*Personnalisation : le réglage `fileListInterval` indique le temps minimum entre deux détections.  Le réglage `watcher.usePolling` change le substrat technique de la détection de changement vers un mode technique très légèrement plus lent, mais parfois plus fiable.  Le réglage `notifications` permet de désactiver les notifications, ou de choisir les niveaux signalés ; consultez [cette page](https://github.com/paulmillr/loggy) pour tous les détails.*

## Serveur web intégré

Brunch peut fournir un **serveur HTTP** statique pour vos fichiers produits, ce qui permet de tester en HTTP et non en fichiers simples.  Il faut que Brunch tourne, ce qui implique qu'on est en mode *watcher*.  Nous verrons les détails de ce serveur tout à l'heure, et notamment comment écrire le nôtre si besoin, mais voici quelques infos sur celui par défaut, obtenu en faisant `brunch watch --server` :

  * Écoute en HTTP sur le port 3333, avec `/` mappé sur le dossier public.
  * Charge automatiquement `index.html` sur une URL de dossier ou un chemin inconnu (afin d'autoriser du `pushState` côté client, notamment).
  * Envoie les en-têtes [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).

*Personnalisation : Le réglage `server` est un objet permettant soit de modifier tous ces comportements, soit d’indiquer carrément un module serveur personnalisé.  L’option de ligne de commande `-p` (ou `--port`) permet de changer le port d’écoute par défaut.*

## Chargement des plugins

Nous y reviendrons, mais pour utiliser un plugin dans Brunch, il suffit de l'installer avec `npm` : **sa simple présence dans `node_modules` et dans `package.json` suffira** à ce qu'il soit recensé, chargé et initialisé par Brunch, et il sera automatiquement employé pour les fichiers et environnements envers lesquels il se sera enregistré au démarrage.

La majorité des plugins Brunch sont conçus pour être **opérationnels sans configuration particulière**.

*Personnalisation : on peut choisir les plugins à (dés)activer au travers des réglages `plugins.on`, `plugins.off` et `plugins.only`, et affiner la configuration des plugins via les têtes de réglages `plugins.<name>`.*

----

Eeeet bravo, vous êtes arrivés jusqu’ici, en ayant lu toute la partie « état des lieux » de ce guide.  C’est l'heure de **pondre du code !**  Le prochain chapitre rentre dans le vif du sujet.

« Précédent : [Démarrer avec Brunch](chapter02-getting-started.md) • Suivant : [Partir de zéro](chapter04-starting-from-scratch.md) »
