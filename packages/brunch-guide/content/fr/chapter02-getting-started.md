# Démarrer avec Brunch

Ceci fait partie du [Guide de Brunch.io](README.md).

Voyons tout ce que vous besoin de savoir pour utiliser agréablement Brunch dans vos projets, nouveaux comme existants.

Comme tous les outils cités plus haut, et comme une térachiée d'outils aujourd'hui, Brunch est **basé sur [Node.js](http://nodejs.org/) et s'installe via [npm](https://www.npmjs.com/)**.  Vous pouvez choisir de l'installer en global, pour pouvoir utiliser la commande `brunch` depuis n'importe où :

```sh
npm install -g brunch
```

…mais **je vous recommanderais plutôt de l'installer localement aussi** à votre projet courant, qui aura de toutes façons besoin d'un `package.json` pour fonctionner (au même titre que les autres outils évoqués dans cet article).  Ainsi, vous pouvez utiliser plusieurs versions distinctes d'un projet à l'autre, **sans conflits**.  Ce qui est bien, c’est que la commande `brunch` installée en global utilisera intelligemment la version locale à votre projet en interne, on a donc le meilleur des deux mondes !

### Faut-il partir d'un squelette ?

Brunch met en avant la notion de **squelette**.  Contrairement à des générateurs comme ceux associés à Yeoman, il s'agit là simplement de **dépôts Git proposant une infra par défaut** pour une application front utilisant Brunch.  Il en existe [un certain nombre](http://brunch.io/skeletons.html), dont l'intérêt principal est de fournir une **base de départ** en créant certains dossiers, en prédéfinissant les dépendances dans le `package.json` et en fournissant une configuration Brunch de départ.

Brunch propose une commande `brunch new` à laquelle on passe un dépôt GitHub (ou toute URL publique de dépôt Git), et un chemin de clonage éventuel.  Ça se limite à un `git clone` suivi d'un `npm install`…

Je vous recommande plutôt de **partir de zéro (ou de votre propre projet)** et de mettre vos fichiers au point vous-mêmes, pour bien maîtriser ce que vous faites.

Et oui, ce chapitre est tout petit.  Mais pas les suivants !

----

« Précédent : [Brunch ?!  C’est quoi, Brunch ?](chapter01-whats-brunch.md) • Suivant : [Conventions et valeurs par défaut](chapter03-conventions-and-defaults.md) »
