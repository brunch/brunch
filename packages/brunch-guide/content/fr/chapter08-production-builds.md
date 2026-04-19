# Builds de développement et de production

Ceci fait partie du [Guide de Brunch.io](README.md).

Par défaut, Brunch s'exécute en environnement de **développement**.  Cela signifie notamment que les plugins de minification (JS ou CSS) ne sont pas appliqués (le réglage `optimize` vaut par défaut `false` en environnement de développement ; on peut bien sûr le changer).

L’environnement est précisé en ligne de commande, par l’option `-e` ou `--env`, à laquelle on passe le nom de l’environnement.  On peut avoir tous les environnements qu’on veut, sachant que `production` est une valeur prédéfinie (avec son option dédiée, `-P` ou `--production`, qui équivaut à `--env production`), notamment parce qu’elle recale par défaut `optimize` à `true`.

Mais surtout, on peut **modifier les réglages pour des environnements précis**, au moyen de la clé racine `overrides`.  On précise en-dessous le nom de l'environnement, et à l'intérieur de celui-ci, des remplacements pour tout réglage où on le juge nécessaire.  La doc officielle donne un exemple qui reflète en fait les réglages par défaut de production :

```js
module.exports = {
  overrides: {
    production: {
      optimize: true,
      sourceMaps: false,
      plugins: {autoReload: {enabled: false}}
    }
  }
}
```

Personnellement j’aime les sourcemaps même en production, du coup je définirais plutôt ceci dans ma configuration :

```js
module.exports = {
  overrides:{
    production:{
      sourceMaps: true
    }
  }
}
```

Notez que vous n’avez pas besoin d’utiliser `overrides` pour surcharger les réglages du mode **développement**.  Dans la mesure où il s’agit du mode par défaut de Brunch, il n’y a rien à surcharger : définissez simplement vos réglages au niveau racine de la configuration.  Pour reprendre l’exemple ci-dessus et activer le réglage `optimize` en développement :

```js
module.exports = {
  optimize: true
  //...
}
```

----

« Précédent : [Adapter Brunch à un projet existant](chapter07-using-brunch-on-legacy-code.md) • Suivant : [*Watcher*](chapter09-watcher.md) »
