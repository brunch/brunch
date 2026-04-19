# Adapter Brunch à un projet existant

Ceci fait partie du [Guide de Brunch.io](README.md).

Jusqu’ici nous sommes partis de zéro, en suivant les conventions de Brunch pour notre codebase.

Supposons à présent que vous partiez d’un projet existant, dont vous souhaitez confier le *build* front à Brunch.  Peut-être venez-vous de Grunt, ou Gulp, ou que sais-je…  Peu importe.  Il faut se poser quelques questions de base :

  1. **Où sont les fichiers sources** pour le build ?
  2. Quels **langages** utilisent-ils ?
  3. Dans quel **dossier cible** va le build ?
  4. Quel est le **mapping** source :arrow_right: cible au sein du build ?
  5. Est-ce que je veux enrober mon JS applicatif en **modules** ?

Le point 1 détermine la valeur du réglage `paths.watched`, pour le ou les répertoires de base à exploiter/surveiller.  La valeur par défaut est `['app', 'test', 'vendor']`, mais il y a fort à parier que vous devrez changer ça.  Autres réglages concernés : `conventions.assets`, qui va déterminer les dossiers dont le contenu sera copié-collé tel quel, et `conventions.vendor`, qui indique les dossiers dont le JS ne doit pas être enrobé en modules, s’il y en a (attention, si vous passez par Bower, les composants qu’il fournit ne sont jamais enrobés).

Le point 2 détermine les **plugins Brunch** à utiliser, sachant qu'on peut très bien mélanger les genres ; par exemple, quand j’utilise Bootstrap, je préfère largement utiliser son code source SASS, afin de facilement personnaliser le thème, notamment dans `_variables.scss`.  Cependant, je préfère Stylus pour mes propres styles, j'ai donc souvent à la fois `sass-brunch` et `stylus-brunch` installés.

Si mon app utilise du MVC côté client, je vais toujours isoler mes templates dans leurs propres fichiers, et donc utiliser par exemple `jade-brunch` ou `dust-linkedin-brunch` pour les convertir de façon transparente en modules exportant une unique fonction de *rendering* qui résulte de la précompilation du template.

Le point 3 détermine la valeur du réglage `paths.public`, qui vaut par défaut `'public'`.  Ce dossier n’a pas besoin d’exister en début de build.  Les fichiers cibles sont exprimés relativement à ce chemin de base.

Le point 4 gouverne la structure du réglage `files`, avec jusqu'à trois sous-sections :

  * `javascripts` : tout ce qui produit du JS à terme, hors pré-compilation de templates (statut spécial) ;
  * `stylesheets` : tout ce qui produit du CSS à terme ;
  * `templates` : tout ce qui concerne la précompilation de templates pour produire à chaque fois une fonction de *rendering* (avec un argument contenant le *presenter*, ou *view model*, et le HTML en valeur de retour synchrone).  Souvent, la cible sera la même que pour la partie noyau de `javascripts`.

Chacune de ces sections a au minimum une propriété `joinTo` qui peut être très simple ou très avancée.  Si on fournit juste un chemin de fichier (une `String`) comme valeur, tous les fichiers candidats iront vers cette unique concaténation.  Si on fournit plutôt un objet, les clés sont les chemins cibles, et les valeurs, qui déterminent quelle portion de la codebase source va vers la cible, sont des *ensembles [anymatch](https://github.com/es128/anymatch#anymatch--)*, c'est-à-dire qu’il peut s’agir de :

  * Une simple **`String`**, qui devra correspondre au chemin exact du fichier, tel que perçu par Brunch (on y reviendra dans un instant) ;
  * Une **expression rationnelle**, qui devra correspondre au chemin du fichier ; très utile pour des préfixes, genre `/^app\//` ou `/^vendor\//` ;
  * Une **fonction prédicat**, qui prendra le chemin exact en argument et renverra de façon synchrone une valeur interprétée comme booléenne ;
  * Un **tableau** de valeurs, qui peuvent chacune être un des types précédents.

C'est donc **extrêmement flexible** comme méthode de répartition entre les cibles (ou même si on n’a qu’une cible, mais qu'on veut filtrer ce qui y va).

Le point 5 ne devrait pas être une vraie question : **bien sûr que vous devriez utiliser des modules**.  On est en 2015, bordel, faut sortir de la préhistoire et du code bordélique, les gens !  Et tant qu'à faire, vous devriez opter pour CommonJS jusqu'à nouvel ordre (ce qui facilite le JS isomorphique et la migration ultérieure vers des modules natifs ES6).

Ça se définit avec les réglages `modules.wrapper` et `modules.definition`.  Si vous avez décidé de rester en mode porcherie, vous pouvez les mettre tous les deux à `false`.  Si vous croyez encore en AMD (ou que la Terre est plate), vous pouvez mettre `amd`.  Il est même possible de fournir des fonctions de personnalisation pour des systèmes plus exotiques.  Par défaut, les deux valent `commonjs`.

## D’où sortent les noms de modules ?

Un dernier point, si vous recourez aux modules (bravo !), est **le nom de ces modules**.  Par défaut, Brunch procède comme suit :

  1. Il prend le chemin exact du fichier, à partir des chemins surveillés (ex. `"app/application.js"`) ;
  2. Il vire l’extension (`"app/application"`) ;
  3. Si vous n’avez qu’un chemin surveillé qui soit sujet à l'enrobage par modules (c'est le cas par défaut, avec juste `"app"`), il retire ce préfixe (ex. `"application"`).  Dans le cas contraire, le préfixe reste.

Si cela vous dérange, vous devrez fournir une fonction de calcul de nom de module personnalisée, via le réglage `modules.nameCleaner`.

Par exemple, dans notre formation [JS Total](http://www.js-attitude.fr/js-total/), nous souhaitons isoler les bibliothèques tierces dans `app/externals/`, et préserver leurs noms longs par-dessus le marché (genre `jquery-1.11.2-min.js` et `moment-2.2.1-fr.js`), mais voulons conserver des **noms de modules simples** (du genre `"jquery"` et `"moment"`).  On a donc le code suivant dans `brunch-config.coffee` :

```js
module.exports = {
  modules: {
    nameCleaner(path) {
      return path
        // Strip app/ and app/externals/ prefixes
        .replace(/^app\/(?:externals\/)?/, '')
        // Allow -x.y[.z…] version suffixes in mantisses
        .replace(/-\d+(?:\.\d+)+/, '')
        // Allow -fr lang suffixes in mantisses
        .replace('-fr.', '.')
    }
  }
}
```

Tranquille…

----

« Précédent : [Un petit coup de *templating*](chapter06-a-shot-at-templating.md) • Suivant : [Builds de développement et de production](chapter08-production-builds.md) »
