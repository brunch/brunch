# Serveur web, intégré ou personnalisé

Ceci fait partie du [Guide de Brunch.io](README.md).

Comme je l’ai signalé plus tôt dans ce guide, le *watcher* permet aussi de lancer en parallèle un **serveur web** pour servir les fichiers produits.  Certaines technologies ont besoin que la page soit servie en HTTP(S), et une simple ouverture du fichier dans le navigateur ne suffit pas.  Ça permet aussi des URLs plus courtes…

Il existe deux manières de lancer ce serveur :

  * **Explicitement** dans la ligne commande : `brunch watch --server`, `brunch watch -s` voire `brunch w -s` si on a bien la flemme ;
  * **Via les réglages** `server` du `brunch-config.coffee`.

Le serveur par défaut est fourni en fait par le module npm [`pushserve`](https://github.com/paulmillr/pushserve), et fournit donc un peu plus qu’un bête serveur statique : il offre une gestion CORS, un routage systématique pour faciliter le recours à l’API [`pushState`](https://developer.mozilla.org/fr/docs/Web/Guide/DOM/Manipuler_historique_du_navigateur), etc.

Si vous souhaitez **toujours lancer** ce serveur quand le *watcher* démarre, il vous suffit de rajouter à la configuration le réglage suivant :

```js
module.exports = {
  server: {run: true}
  // ...
}
```

Si vous voulez **un port différent** de 3333, renseignez aussi le réglage `server.port` avec le numéro.

## Écrire notre propre serveur

Il n’empêche, parfois votre micro-serveur a besoin de **fonctionnalités en plus**, ne serait-ce que pour une **démo** ou une **formation**…  Voyons comment réaliser **notre propre serveur**, qui fournirait en plus deux points d’accès REST :

  * POST sur `/items` avec un champ `title` ajoute une entrée.
  * GET sur `/items` renvoie la liste des entrées.

Nous allons rester simples et utiliser ce bon vieux [Express](http://expressjs.com/), avec le minimum de modules pour fournir notre service.

Par défaut, Brunch va détecter un fichier `brunch-server.coffee` ou `brunch-server.js` pour votre **module** de serveur personnalisé.  Vous pouvez toutefois préciser un autre chemin avec le réglage `server.path`.

Ce module doit **exporter une fonction directement** (export par défaut, avec `module.exports = `) dont la signature sera la suivante :

```js
yourFunction(port, path, callback)
```

Avant Brunch 1.8, vous deviez exporter une méthode `startServer` sur l’objet d’export.  Ça marche toujours, mais vous devriez adopter la nouvelle approche et exporter la fonction directement comme export par défaut du module.

Lorsque votre serveur a fini de démarrer, il appelle `callback()` pour que **Brunch reprenne la main**.  Le serveur est **automatiquement arrêté** quand le *watcher* de Brunch s’arrête.

Voici notre serveur d’exemple.  Il aurait pu être écrit en CoffeeScript, mais pour rester accessible à la totalité de mes lecteurs, le voici en JS.  Je l'ai mis dans un fichier `custom-server.js` :

```js
'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const logger = require('morgan');
const Path = require('path');

// Notre fonction de démarrage serveur
module.exports = function startServer(port, path, callback) {
  const app = express();
  const server = http.createServer(app);

  // Stockage en mémoire des entrées gérées via REST
  const items = [];

  // Middlewares de base : fichiers statiques, logs, champs de formulaire
  app.use(express.static(Path.join(__dirname, path)));
  app.use(logger('dev'));
  app.use(bodyParser.urlencoded({ extended: true }));

  // GET `/items` -> JSON du tableau des entrées
  app.get('/items', (req, res) => {
    res.json(items);
  });

  // POST `/items` -> Ajout d’une entrée d’après le champ `title`
  app.post('/items', (req, res) => {
    const item = (req.body.title || '').trim();
    if (!item) {
      return res.status(400).end('Nope!');
    }

    items.push(item);
    res.status(201).end('Created!');
  })

  // Mise en écoute du serveur sur le bon port, notif à Brunch une fois
  // prêts, grâce à `callback`.
  server.listen(port, callback);
};
```

Pour que ça marche, on prend soin d’ajouter les modules nécessaires à notre `package.json` :

```sh
$ npm install --save-dev express body-parser morgan
```

Puis on modifie notre configuration, en rendant le serveur automatique tant qu’à faire :

```js
module.exports = {
  server: {run: true}
}
```

Tentez un *watcher* :

```sh
$ brunch w
02 Mar 12:45:04 - info: application started on http://localhost:3333/
02 Mar 12:45:04 - info: compiled 3 files into 3 files, copied index.html in 269ms
```

Remarquez les infos sur le serveur personnalisé.  Tentez un accès à `localhost:3333` désormais : ça marche !  Histoire de tester ça, modifions notre `application.js` pour qu’il utilise l’API exposée par le serveur :

```js
'use strict';

const count = 0;

const App = {
  items: ['Learn Brunch', 'Apply to my projects', '…', 'Profit!'],

  init() {
    const tmpl = require('views/list');
    const html = tmpl({ items: App.items });
    $('body').append(html);

    App.items.forEach(item => requestItem(item));
  }
};

function requestItem(item) {
  $.ajax('/items', {
    type: 'post',
    data: { title: item },
    success: res => {
      console.log(`Successfully posted entry “${item}”: ${res}`);

      if (++count === App.items.length) {
        $.getJSON('/items', res => {
          console.log('Successfully fetched back entries:', res);
        });
      }
    }
  });
}

module.exports = App;
```

Le *watcher* récupère notre mise à jour, et si nous rafraîchissons la page et que nous examinons la console, nous voyons ceci :

![Notre serveur personnalisé fonctionne bien](../images/brunch-simple-json.png)

Tout roule ! (づ￣ ³￣)づ

## Et on n’est pas obligés de le faire en Node…

Un dernier réglage serveur qui mérite d’être mentionné : `server.command`, qui remplace en fait tous les autres réglages de `server`.  Il vous permet de spécifier une ligne de commande qui lancera votre serveur personnalisé, lequel peut donc utiliser une autre technique que Node, telle que PHP, Ruby ou Python…  Vous pourriez par exemple utiliser un truc de ce genre :

```js
module.exports = {
  server: {
    command: "php -S 0.0.0.0:3000 -t public"
  }
  // ...
}
```

----

« Précédent : [*Watcher*](chapter09-watcher.md) • Suivant : [Des plugins pour tous les besoins de build](chapter11-plugins.md) »
