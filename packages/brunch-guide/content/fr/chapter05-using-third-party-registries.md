# Utiliser des référentiels de modules tiers

Ceci fait partie du [Guide de Brunch.io](README.md).

Dans la pratique, ce qui est vraiment agréable pour les dépendances tierces, c'est de pouvoir s'appuyer sur des **référentiels de modules existants**.  Côté front, on trouve essentiellement **[npm](https://www.npmjs.com/)** (valable pour Node.js et pour le front, et qui vient notamment de remplacer le référentiel officiel des plugins jQuery) et [Bower](http://bower.io/) (qui est, à mon humble avis, sur le départ, car npm est en train de le rendre obsolète).

Tout l'intérêt d'une gestion de dépendances formelle, c'est qu'on peut exprimer des **dépendances flexibles sur les versions**, et faciliter l'installation et la **mise à jour** des dépendances.

Brunch est en train de bosser dur pour nous fournir une intégration de tout premier ordre avec npm, ce qui facilitera le JS isomorphique et nous permettra d'exploiter nos installations `node_modules` de façon transparente dans notre code applicatif front.  Pour le moment, en revanche, on est contraints de jouer avec le [plugin pour Browserify](https://www.npmjs.com/package/browserify-brunch).

En attendant, l'intégration Bower [est déjà là](https://github.com/brunch/brunch/blob/master/docs/faq.md#how-to-use-bower).  On aurait pu s'en servir pour jQuery, par exemple.  Si nous utilisons le `bower.json` suivant pour décrire notre projet :

```json
{
  "name": "simple-brunch",
  "version": "0.1.0",
  "private": true,
  "ignore": ["**/.*", "node_modules", "bower_components", "test", "tests"]
}
```

On installerait alors comme ceci :

```sh
$ bower install --save jquery#1.*
…

jquery#1.11.3 bower_components/jquery
```

Cette commande interroge le référentiel de Bower pour obtenir la version la plus récente de jQuery dans la tranche 1.x, l’installe dans le bon dossier local, et met à jour `bower.json` pour refléter le composant fraîchement installé.

On peut désormais retirer le `jquery.js` de notre `app`.  On va ajuster `brunch-config.coffee` pour qu'il colle toujours nos éléments dans deux cibles distinctes, sachant que les *regexes* de tout à l'heure ne sont plus adaptées :

```js
module.exports = {
  files: {
    javascripts: {joinTo: {
      'libraries.js': /^(?!app\/)/,
      'app.js': /^app\//
    }},
    stylesheets: {joinTo: 'app.css'}
  }
}
```

Qui plus est, c'est Bower, donc **ça n'expose pas de modules (ಥ﹏ಥ)**.  On ajuste notre `app/application.js` pour supposer à nouveau que `$` est global, en retirant la ligne `require(…)` (bleuargh).

Puis on rebuilde, et ça marche !

----

« Précédent : [Partir de zéro](chapter04-starting-from-scratch.md) • Suivant : [Un petit coup de *templating*](chapter06-a-shot-at-templating.md) »
