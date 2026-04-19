"use strict";

var exec = require('child_process').exec;

// Marqueur par défaut.  Peut être configuré via `plugins.gitSHA.marker`.
var DEFAULT_MARKER = 'GIT-SHA';

function GitShaPlugin(config) {
  // Construit le `pattern` attendu par Brunch pour déterminer si notre
  // plugin correspond ou non à chaque fichier en cours de compilation.
  //
  // On prendra n’importe quel fichier à l’intérieur des répertoires
  // surveillés, hors les assets.
  var pattern = config.paths.watched.map(escapeRegex).join('|');
  pattern = '^(?:' + pattern + ')/(?!assets/).+';
  this.pattern = new RegExp(pattern, 'i');

  // Définition de la regex du marqueur.
  var marker = (config.plugins.gitSHA || {}).marker || DEFAULT_MARKER;
  this.marker = new RegExp('!' + escapeRegex(marker) + '!', 'g');
}

// Indique à Brunch qu’on est bien un plugin
GitShaPlugin.prototype.brunchPlugin = true;

// Callback de compilation à la volée (fichier par fichier) ; suppose
// que Brunch a fait la correspondance avec notre `type`, `extension` ou
// `pattern`.
GitShaPlugin.prototype.compile = function processMarkers(params, callback) {
  var self = this;
  getSHA(function(err, sha) {
    if (!err) {
      params.data = params.data.replace(self.marker, sha);
    }
    callback(err, params);
  });
};

// Utilitaire : échappe tout caractère spécial de regex
function escapeRegex(str) {
  return String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Utilitaire : obtient le SHA abrégé du commit de référence (HEAD).
function getSHA(callback) {
  exec('git rev-parse --short HEAD', function(err, stdout) {
    callback(err, err ? null : stdout.trim());
  });
}

// Le plugin est l’export par défaut du module.
module.exports = GitShaPlugin;
