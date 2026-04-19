# Un petit coup de *templating*

Ceci fait partie du [Guide de Brunch.io](README.md).

Ce qu’on a fait dans les chapitres précédents est déjà super cool, mais je m'en voudrais de ne pas vous faire une petite démo de *templating*, tant qu'à faire.  Z’avez bien deux minutes ?

Le principe des plugins de *templating* de Brunch est simple :

  * Les templates sont dans **leurs propres fichiers**, bien séparés du JS ;
  * Ces fichiers sont **précompilés** par le moteur de *templating* approprié, pour produire une **fonction JS** prête à l'emploi : on lui file les données dynamiques sous forme d'un objet (souvent appelé *presenter* ou *view model*), elle retourne du HTML.
  * Cette fonction est **enrobée en module**, comme d'hab ; c'est son export par défaut.

Cette approche nous **évite de pourrir notre JS** avec du code de templates, comme on le voit trop souvent à coup d'énormes `String` littérales, mais aussi **évite de pourrir notre HTML** à coup de templates injectés dans des balises de type `<script type="template/handlebars">`, ce qui m'a toujours semblé un gros hack dégueulasse.  Ça nous laisse JSX, certes, mais même là, y'a une astuce…

Un des intérêts côté éditeur, c'est qu'on a donc des fichiers dédiés aux templates, avec la bonne extension et la bonne coloration syntaxique.

On va utiliser [Jade](http://jade-lang.com/), parce que voilà, Jade, c'est sympa comme tout.  Si vous faites plein de Ember à côté, jetez un œil à [Emblem](http://emblemjs.com/), aussi, c'est un peu leur fils caché à tous les deux.

Commençons par installer le plugin :

```sh
npm install --save-dev jade-brunch
```

Indiquons ensuite à Brunch d'incorporer les modules résultats dans notre JS concaténé applicatif :

```js
module.exports = {
  files: {
    javascripts: {joinTo: {
      'libraries.js': /^bower_components/,
      'app.js': /^app/
    }},
    stylesheets: joinTo: 'app.css'
  },
  templates: {joinTo: 'app.js'}
}
```

À présent ajoutons notre template, par exemple dans `app/views/list.jade` :

```jade
h2 Things to do:

ul#mainTodo.tasks
  each item in items
    li= item
```

L’utilisation au sein de notre `application.js` est super simple :

```js
"use strict";

const $ = require('jquery');

const App = {
  items: ['Learn Brunch', 'Apply to my projects', '…', 'Profit!'],

  init() {
    const tmpl = require('views/list');
    const html = tmpl({ items: App.items });
    $('body').append(html);
  }
};

module.exports = App;
```

On builde, on ouvre `public/index.html`, et là…

![Notre template marche bien](../images/brunch-simple-templating.png)

C’est pas un peu la grosse classe à Dallas ça Madame ?

----

« Précédent : [Utiliser des référentiels de modules tiers](chapter05-using-third-party-registries.md) • Suivant : [Adapter Brunch à un projet existant](chapter07-using-brunch-on-legacy-code.md) »
