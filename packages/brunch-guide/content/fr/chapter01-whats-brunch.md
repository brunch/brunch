# Brunch ?!  C'est quoi, Brunch ?

Ceci fait partie du [Guide de Brunch.io](README.md).

[Brunch](http://brunch.io/) est un **builder**.  Pas un exécuteur de tâches générique, mais un outil **spécialisé** dans la production de fichiers finaux pour la production, à partir de tout un tas de fichiers de développement.

Ce type de besoin est **extrêmement fréquent chez les devs front** et les [designers front](http://www.stpo.fr/blog/je-ne-suis-pas-developpeur/), qui ont souvent besoin de faire un peu les mêmes choses : partir d’une arborescence de fichiers LESS ou SASS pour produire un ou plusieurs CSS minifiés, pareil pour du JS, des images et leurs sprites, etc.

## Brunch face aux autres

L’immense majorité des personnes qui automatisent ce type de tâches utilisent soit [Grunt](http://gruntjs.com/), soit [Gulp](http://gulpjs.com/) (et parfois [Broccoli](https://github.com/broccolijs/broccoli)).  Bien qu’extrêmement populaires, et arrivés sur le marché plus récemment que Brunch, ces solutions lui sont **souvent inférieures dans les scenarii d’utilisation courants**.

J’utilise Brunch depuis juin 2012 (autour de sa version 1.3 ; il remonte au printemps 2011), et jusqu’à présent, il constitue encore pour moi une alternative **très supérieure** aux autres acteurs apparus depuis.

Afin de bien cerner ce qui distingue Brunch des autres solutions du marché, nous allons aborder différents aspects techniques et architecturaux, qui constituent chacun des **choix de conception** autour desquels se répartit l’écosystème.

Après quoi, on se tapera tout plein de démos sur du code concret, n'ayez crainte :wink:.

## Exécuteurs de tâches vs. outils de build

Le marché est dominé par des exécuteurs de **tâches génériques**.  Ces outils fournissent un mécanisme de description de tâches, et de dépendances entre ces tâches.  Il peut s’agir de n’importe quoi : copier un fichier, en produire un, envoyer un e-mail, compiler quelque chose, lancer les tests, faire un commit Git…  absolument ce que vous voulez.

C’est une notion **très ancienne** ; un des premiers exécuteurs de tâche génériques connus était [Make](http://www.gnu.org/software/make/) (et ses fameux fichiers `Makefile`) ; dans l’univers Java, on a d’abord eu [Ant](http://ant.apache.org/), et comme si ça n’était pas assez verbeux, on a désormais l’énorme mammouth sclérosé qu’est [Maven](http://maven.apache.org/) ; Ruby de son côté a [Rake](http://docs.seattlerb.org/rake/), etc.

Parce que ces exécuteurs sont génériques, il ne leur est que **rarement possible d’optimiser automatiquement** pour des scenarii spécifiques, ou même de mettre en place des conventions par défaut.  Toute tâche nécessite l’écriture d’un **volume non trivial de code** et/ou de configuration, et doit être **invoquée explicitement** aux bons endroits.

Qui plus est, toute tâche—et même tout comportement de fond, comme la surveillance des fichiers pour mettre à jour le build—nécessite l’écriture d’un plugin, son chargement, sa configuration, etc.

**Brunch est un outil de build.**

Brunch est **fondamentalement** spécialisé dans le **build d’assets**, ces fichiers qui seront utilisés à terme par la plate-forme d’exécution, en général le navigateur.  Il fournit donc d'entrée de jeu un certain nombre de comportements et fonctionnalités.  On y trouve notamment :

* la catégorisation des fichiers sources : JavaScript, Feuilles de style,  Templates ou « divers » ;
* la **concaténation intelligente** de ces fichiers vers un ou plusieurs fichiers cibles ;
* **l’enrobage en modules** des fichiers catégorisés JavaScript ;
* la production des **[source maps](http://blog.teamtreehouse.com/introduction-source-maps)** associées ;
* la **minification** des fichiers produits si on est en « mode production » ;
* la **surveillance** des fichiers sources pour mettre à jour le build à la volée.

Toutes ces fonctionnalités sont rendues possibles grâce à la spécialisation de l’outil, mais restent **très simples d’emploi** (le plus souvent, carrément **automatiques**) grâce à un jeu habile de conventions, que nous verrons tout à l'heure.

## Traitements de fichiers vs. pipelines

La **faiblesse principale de Grunt** est la même que pour Make, Ant et Maven, qui l’ont inspiré : il repose entièrement sur la notion de **fichiers**.  Toute tâche qui manipule du contenu part d'un fichier pour aboutir à un autre.

Cette approche est **extrêmement limitative** dès qu'on touche à des *workflows* fréquents, où la modification d'un unique fichier source peut impacter **plusieurs destinations**, par exemple une concaténation, la *source map* associée, un manifeste AppCache…  Dans Grunt, on passe son temps à produire des **fichiers temporaires** pour les étapes intermédiaires de traitement, ce qui est un **foutoir sans nom**.

L'autre inconvénient majeur de cette approche, c'est qu'elle est [**désastreuse en performances**](https://www.google.fr/webhp?sourceid=chrome-instant&ion=1&espv=2&ie=UTF-8#q=why%20is%20grunt%20so%20slow) : on passe sa vie à fermer et rouvrir les mêmes fichiers, à les relire autant de fois que nécessaire, même pour une seule passe de build.

L'alternative, c'est la **pipeline** : on connecte les fichiers entre eux au travers de diverses déclarations de dépendances, et lorsqu'un fichier change, son nouveau contenu n'est lu qu'une fois, pour pouvoir être traité par toute une série d'étapes consommatrices, successives ou parallèles.

C'est l'approche fondamentale de Gulp, également retenue par Broccoli, et naturellement Brunch.

**Brunch est une *pipeline*.**

Mais toutes les pipelines ne sont pas égales, et leurs performances peuvent différer considérablement.  Ainsi, **Gulp reste beaucoup trop lent** pour une utilisation « watcher » confortable, alors que Brunch peut être **extrêmement rapide**.

## Configuration et boilerplate vs. conventions

Dans la plupart des catégories d'outils informatiques, on va trouver deux approches : celle basée sur le code et la configuration d’une part, et celle basée sur les conventions d'autre part.

La première a le mérite d'être explicite, dénuée de toute « magie » pour un débutant, mais au prix d'une **verbosité souvent rebutante et contre-productive**, avec énormément de [boilerplate](http://gruntjs.com/sample-gruntfile) : les mêmes segments de code copiés-collés d'un projet à l'autre jusqu'à plus soif, qui noient le sens de la tâche sous des tartines de code à faible valeur ajoutée.

La seconde **minimise le code ou la configuration nécessaire** à ce qui change du « chemin habituel », lequel est inscrit dans les conventions retenues par l'outil.  Suivez les conventions, et vous n'aurez rien (ou presque) à écrire ou personnaliser ; sortez-en, et là vous devrez écrire du code ou configurer l'outil pour vos besoins propres.

L'avantage est évident : **la concision et l'expressivité** de votre contenu, qui ne dit rien de superflu.  L'inconvénient : pour quiconque n'a pas lu la doc (et les développeurs *détestent* lire la doc, pensant tous avoir la science infuse…), ça donne le sentiment d'être un peu trop « magique ».

**Brunch repose sur des conventions solides, réduisant la configuration au minimum vital.**

Ce choix architectural est bien connu sous le nom de **Convention Over Configuration**, ou CoC, et c'est par exemple celui de Ruby on Rails ou d’Ember.js.  C'est aussi celui de Brunch.

## Builds intégraux vs. builds incrémentaux

La majorité des exécuteurs de tâches et outils de builds proposent deux modes : le **build unique** (*one-shot*) ou le **watcher**.  Dans ce deuxième mode, l'outil réalise le premier build, puis surveille les fichiers et répertoires pertinents pour détecter toute modification ultérieure ; il déclenche alors immédiatement une mise à jour du build.

Cette mise à jour peut elle aussi avoir deux approches distinctes : soit elle **reconstruit tout** à partir du début (ce qui ne nécessite aucune connaissance particulière de la sémantique des tâches concernées), soit elle ne relance **que les étapes de construction nécessaires** au vu des modifications constatées, pour minimiser le travail de mise à jour.

Cette deuxième voie est **évidemment préférable** en termes de performances, et peut faire la différence entre un build de 2 secondes et un autre de 0,2 secondes, voire entre un de 50s et un de 0,5s.  Mais pour y parvenir, il faut une description fine des dépendances entre les tâches, généralement au moyen d’une pipeline, ainsi qu'un mécanisme de mise en cache des produits intermédiaires.  On parle alors de **build incrémental**.

Je n'ai que récemment découvert, abasourdi, que Grunt et Gulp n'opéraient pas selon cette approche ; des [plugins](https://github.com/wearefractal/gulp-cached) [existent](https://github.com/ahaurw01/gulp-remember) apparemment pour Gulp, mais leur configuration appropriée est semble-t-il souvent complexe, pour des résultats sous-optimaux.

**Brunch fait du build incrémental.**

Pour ma part, cette approche est la seule qui vaille le coup ; sans elle, les performances du *watcher* sont minables, trop lentes pour être réellement utiles tout au long de la journée.  C'est à tel point une évidence pour moi qu'il ne m'était même pas venu à l'idée que Grunt et Gulp procédaient différemment.

Brunch opère évidemment ainsi depuis toujours.

## L'importance primordiale de la vitesse

Vous avez remarqué que dans les points précédents, la vitesse revenait toujours comme préoccupation centrale.  Il y a une bonne raison à cela.

Pour être vraiment utiles, pour nous procurer réellement le **confort de travailler** sur un nombre quelconque de fichiers sources de tous types (JS, CoffeeScript, TypeScript, ES6 voire ES7, React, LESS, SASS, Stylus, Handlebars, Jade, Dust, et que sais-je encore…) tout en conservant la possibilité de voir nos modifications dans le navigateur **des centaines de fois par jour**, il faut que le *watcher* de l'outil soit à même de mettre à jour le build **vite**.

Vite, ça veut dire **en-dessous de 300ms**, même pour des cas lourds et complexes.  Pour des cas simples, ça devrait être l'affaire de 20 à 100ms (le délai minimum d’une modification visuelle dans les préceptes usuels d’Interface Utilisateur).

Cela peut vous sembler excessif, mais dès qu'on dépasse ça pour atteindre 2, 3 voire 10 secondes, comme c'est trop fréquemment le cas avec Grunt ou Gulp, qu'obtient-on ?  Des développeurs et designers qui passent **plus de temps à regarder la console de leur outil** après chaque sauvegarde de fichier qu'à regarder le résultat de leur modification dans le navigateur.

Les merveilles de l'injection à la volée du CSS ou du JS dans la page ouverte **ne servent à rien** si on doit commencer par attendre plusieurs secondes que le build soit mis à jour.  Même un bon vieux Alt+Tab suivi d'un rafraîchissement se prend les pieds dans le tapis s'il doit d'abord attendre plusieurs secondes.  **La boucle de *feedback* s'effondre**, sa courroie grippe trop.

**Brunch est ultra-rapide.**

Si vous voulez voir à quoi ressemble un **feedback efficace**, regardez donc [cet extrait](http://youtu.be/2Dl9ES6IC3c?t=26m55s) de mon screencast « Dev Avengers pour le web front », vous allez voir.  Il me suffit d'observer les yeux de l'auditoire quand je montre ça pour bien sentir à quel point les *fronteux* ont faim de ça.

### Mais alors pourquoi entend-on seulement parler des autres ?

En un mot ?  **Le marketing**.

**Grunt** a été le premier à faire vraiment parler de lui (à partir du 2e semestre 2012), et son développement a continué avec sa sélection comme outil de build par l'écosystème Angular ; il a connu un **pic fin 2013**, époque à laquelle Gulp est venu lui grignoter une part de marché sans cesse croissante.

Broccoli reste à la marge, même s'il fait de temps en temps parler de lui.

Et Brunch ?  Brunch n'a jamais fait beaucoup de bruit.  Il vit sa vie, la communauté de ses utilisateurs est **extrêmement fidèle**, et la grande majorité de ceux à qui on le montre sont vite convaincus : depuis près de 3 ans que je m’en sers dans mes formations JS (JS Guru puis [JS Total](http://www.js-attitude.fr/js-total/) et [Node.js](http://www.js-attitude.fr/node-js/)), c'est le premier truc que les apprenants veulent mettre en œuvre, de retour au boulot le lundi qui suit :-)  Et chaque fois que je présente [Dev Avengers](https://www.youtube.com/watch?v=2Dl9ES6IC3c), les gens ouvrent des yeux comme des ronds de flan…

Mais il reste plutôt discret.  Avec environ 4 000 *stars* GitHub (44% de Grunt), 270 forks et 4 ans d'existence active, il est tout sauf faiblard, juste… discret.

Ceci dit, 2014 a commencé à voir une renaissance de Brunch dans l'esprit des développeurs. [Divers](http://alxhill.com/blog/articles/brunch-coffeescript-angular/) [articles](http://blog.jetbrains.com/webstorm/2014/06/the-brunch-build-tool/) voient le jour.  3 ans après sa naissance, les gens semblent soudain se rendre compte de sa présence.  Par exemple :

<blockquote class="twitter-tweet" lang="fr"><p>Brunch is an ultra-fast HTML5 build tool <a href="http://t.co/jDhHaPPN2J">http://t.co/jDhHaPPN2J</a></p>&mdash; Christian Heilmann (@codepo8) <a href="https://twitter.com/codepo8/status/513779957584371712">21 septembre 2014</a></blockquote>

<blockquote class="twitter-tweet" data-conversation="none" data-cards="hidden" data-partner="tweetdeck"><p><a href="https://twitter.com/tomdale">@tomdale</a> skip the task runners and messy config files. plug-in based build tools ftw. <a href="http://t.co/6U0XV1GYMB">http://t.co/6U0XV1GYMB</a></p>&mdash; Josh Habdas (@jhabdas) <a href="https://twitter.com/jhabdas/status/535878760097398784">21 novembre 2014</a></blockquote>

<blockquote class="twitter-tweet" data-conversation="none" data-cards="hidden" data-partner="tweetdeck"><p><a href="https://twitter.com/Ken_Stanley">@Ken_Stanley</a> Just discovered brunch.io today too which makes life even easier.</p>&mdash; Hugh Durkin (@hughdurkin) <a href="https://twitter.com/hughdurkin/status/553993540070830080">10 janvier 2015</a></blockquote>

Il y a donc de l'espoir !

Personnellement, je l'utilise pour absolument tous mes builds front, du petit projet au gros mammouth, depuis 2012.  Et **toujours avec le même bonheur**.

Avec cet article, je vais essayer de vous donner une bonne idée de ce qu'il a dans le ventre ; j'espère que ça vous donnera envie de l'essayer sur vos prochains projets, petits et grands.  Si vous venez de Grunt ou Gulp, en particulier sur des besoins riches de build, ça risque de vous faire un choc :smile:

Passons maintenant au chapitre 2 : [Démarrer avec Brunch](chapter02-getting-started.md) !
