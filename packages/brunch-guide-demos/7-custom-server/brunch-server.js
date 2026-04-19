'use strict';

var bodyParser = require('body-parser');
var express    = require('express');
var http       = require('http');
var logger     = require('morgan');
var Path       = require('path');

// Notre fonction de démarrage serveur
module.exports = function startServer(port, path, callback) {
  var app = express();
  var server = http.createServer(app);

  // Stockage en mémoire des entrées gérées via REST
  var items = [];

  // Middlewares de base : fichiers statiques, logs, champs de formulaire
  app.use(express.static(Path.join(__dirname, path)));
  app.use(logger('dev'));
  app.use(bodyParser.urlencoded({ extended: true }));

  // GET `/items` -> JSON du tableau des entrées
  app.get('/items', function(req, res) {
    res.json(items);
  });

  // POST `/items` -> Ajout d’une entrée d’après le champ `title`
  app.post('/items', function(req, res) {
    var item = (req.body.title || '').trim();
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
