# Réaliser un plugin Brunch

Tous les plugins présentés dans le chapitre précédent sont bien sympa, mais je suis sûr qu'à ce stade vous êtes déjà en train de réfléchir à ce nouveau plugin tout frais que vous aimeriez créer, pas vrai ?  Pas d'inquiétude, je vais vous montrer comment faire **vos propres plugins** Brunch…

Brunch découpe ses plugins en plusieurs catégories : compilateurs, linters, optimiseurs…  Suivant leur catégoriée détectée, ils sont consultés à divers moments du cycle de build, dans différents environnements, etc.

Une doc « API » est [disponible en ligne](https://github.com/brunch/brunch/blob/master/docs/plugins.md), qui aide pas mal, et puis bien sûr on est libre de consulter le source des plugins existants.  Mais pour vous mettre le pied à l'étrier, on va faire un plugin de type compilateur, qui sera générique quant aux extensions, toutefois.

Je vous ai parlé tout à l'heure du plugin `git-digest-brunch`, qui injecte dans les fichiers produits le SHA du HEAD à la place du marqueur `?DIGEST` (il vise les URLs des assets).  L’idée est de proposer une sorte de *cache busting*.  Ce plugin n'intervient d'ailleurs qu'en mode production (ou plus exactement que lorsque le réglage `optimize` est actif).

Nous allons faire une variation de ça : un plugin qui remplace à la volée, au fil des compilations, un marqueur libre.  Notre **spécification fonctionnelle** serait la suivante :

  * Le **marqueur** est `!GIT-SHA!` par défaut, mais la partie entre les points d'exclamation doit pouvoir être **configurée** via `plugins.gitSHA.marker`.
  * La transformation se fait **à tout moment, à la volée** (builds one-shot ou *watcher*, production ou non).
  * Tous les fichiers des répertoires surveillés (quels qu'ils soient) sont concernés, sauf les « purs statiques » (ceux qui sont dans un sous-dossier `assets`).
  * Le marqueur comme les noms de dossiers surveillés doivent **pouvoir contenir des caractères spéciaux** d'expression rationnelle sans que cela pose problème.

Sur cette base, comment procéder ?  Un plugin Brunch est avant tout **un module Node**, alors commençons par créer un dossier `git-sha-plugin` et déposons-y un `package.json` approprié :

```json
{
  "name": "git-sha-brunch",
  "version": "1.8.0",
  "private": true,
  "peerDependencies": {
    "brunch": "~1.8"
  }
}
```

La partie `peerDependencies` n'est pas obligatoire (elle est même en phase de dépréciation), mais bon…  En revanche, il est communément admis que les plugins Brunch suivent les numéros de versions majeur et mineur du Brunch à partir duquel ils sont compatibles.  Donc si vous ne testez pas en-dessous de 1.8 par exemple, assurez-vous que votre version à vous démarre bien par 1.8.  Remarquez que ça entre en conflit direct avec le *semantic versioning* ([semver](http://semver.org/lang/fr/)), du coup l’équipe de Brunch est en train de réfléchir à une meilleure manière d’exprimer la compatibilité entre le noyau et les plugins.

Comme on n'a pas précisé de champ `main`, Node supposera que notre point d'entrée est un fichier `index.js`.  On sait qu'un plugin Brunch est un constructeur dont le `prototype` est doté de certaines propriétés, mentionnées plus haut dans cet article :

  * `brunchPlugin`, qui doit valoir `true` ;
  * `type`, `extension` ou `pattern` pour pouvoir être consulté au fil de la compilation ;
  * `preCompile(…)` si on veut exécuter un traitement avant le début de la compilation proprement dite ;
  * `compile(…)`, `lint(…)` ou `optimize(…)`, suivant le rôle ;
  * `onCompile(…)` si on veut n'être notifié qu'en fin de build (même si c'est du *watcher*)
  * `teardown(…)` si on doit faire du nettoyage lorsque Brunch s'arrête (par exemple arrêter un serveur qu'on aurait lancé dans le constructeur).

(En réalité, à part `brunchPlugin`, toutes les autres propriétés peuvent être définies dynamiquement sur l'instance produite par le constructeur, mais c'est rarement le cas, sauf pour `pattern`.)

Nous allons donc partir du squelette suivant dans `index.js` :

```js
'use strict';

// Default marker.  Can be configured via `plugins.gitSHA.marker`.
const DEFAULT_MARKER = 'GIT-SHA';

// Helper: escapes any regex-special character
function escapeRegex(str) {
  return String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

class GitShaPlugin {
  constructor(config) {
    // 1. Build `pattern` from config

    // 2. Precompile the marker regexp from config
  }

  // On-the-fly compilation callback (file by file); assumes Brunch already
  // accepted that file for our plugin by checking `type`, `extension` and
  // `pattern`.
  compile(file) {
    // No transformation for now
    return Promise.resolve(file);
  }
}

// Tell Brunch we are indeed a plugin for it
GitShaPlugin.prototype.brunchPlugin = true;

// The plugin has to be the module’s default export
module.exports = GitShaPlugin;
```

OK, commençons par le constructeur.  On n'est pas spécialisés sur un type de fichier (scripts, styles ou templates), donc pas de propriété `type` sur notre prototype.  Et on n'est pas limités à une extension, donc pas de propriété `extension` non plus.  Il va nous falloir un `pattern`, qui est une [expression rationnelle](http://www.js-attitude.fr/2012/08/13/enfin-maitriser-les-expressions-rationnelles/).

Comme celui-ci dépend des chemins, pas des extensions, il a besoin de la configuration, et sera créé dynamiquement à partir de ça.  Le code sera celui-ci, au début du constructeur :

```js
let pattern = config.paths.watched.map(escapeRegex).join('|');
pattern = `^(?:${pattern})/(?!assets/).+`;
this.pattern = new RegExp(pattern, 'i');
```

Ainsi, les chemins par défaut (`['app', 'vendor', 'test']`) donneront l'expression suivante : `/^(?:app|vendor|test)\/(?!assets\/).+/i`.

À présent le marqueur.  Le code sera un poil plus simple :

```js
const {marker = DEFAULT_MARKER} = config.plugins.gitSHA;
this.marker = new RegExp(`!${escapeRegex(marker)}!`, 'g');
```

On est sûrs que `config.plugins` existe, même s’il est un objet vide.  Du coup sa propriété `gitSHA` pourrait être `undefined` d'où le `|| {}` pour obtenir un objet vide dans ce cas.  On y choppe `marker`, là aussi potentiellement `undefined`, ce qui nous amènerait de toutes façons à `DEFAULT_MARKER`.  Mais si la clé de configuration est là, on prend.

Et on construit une bonne fois pour toutes la regexp correspondante.

À présent, chaque fois que `compile(…)` sera appelée (ce qui sous-entend qu'on est bien sur un fichier qui nous concerne, d'après notre `pattern`), il nous va falloir récupérer le SHA du HEAD Git en vigueur, et procéder au remplacement dans le contenu en mémoire pour le fichier.

On ne récupère pas le SHA une seule fois au démarrage, car il est fréquent qu'on committe au fil du dev, sans arrêter le *watcher* Brunch pour autant, et du coup la valeur deviendrait obsolète au fil du temps.

Cette récupération se fait en exécutant un `git rev-parse --short HEAD` en ligne de commande, ce qui, pour être propre et fidèle à l’esprit Node, est fait en asynchrone.  On utilisera donc une fonction de rappel, en prenant soin de transmettre l'erreur éventuelle (genre, tu n'es pas dans un dépôt Git).

Voici notre petite fonction utilitaire :

```js
const {exec} = require('child_process');

function getSHA(callback) {
  exec('git rev-parse --short HEAD', function(err, stdout) {
    callback(err, err ? null : stdout.trim());
  });
}
```

Et maintenant, à nous la transformation à proprement parler :

```js
compile(file) {
  return new Promise((resolve, reject) => {
    getSHA((err, sha) => {
      if (err) return reject(err);
      file.data = file.data.replace(this.marker, sha);
      resolve(file);
    });
  });
}
```

Et hop !

Pour **tester notre plugin sans pourrir npm**, nous allons faire ce qu'on appelle un `npm link` : l'installation en local d'un module en cours de développement.

Si vous avez récupéré le [dépôt d'exemple](https://github.com/brunch/brunch-guide-demos), vous avez parmi les dossiers :

  * `6-templates`, le dernier où on ne jouait pas avec un serveur custom, et
  * `8-git-sha-plugin`, qui contient le code ci-dessus, dûment commenté.

Voici comment faire :

  1. Allez dans `8-git-sha-plugin` depuis la ligne de commande ;
  2. Faites un `npm link` : ça va enregistrer le dossier courant comme source des futurs `npm link git-sha-plugin` ;
  3. Allez dans `6-templates` depuis la ligne de commande ;
  4. Faites un `npm link git-sha-plugin` : ça va vous l’installer (si on veut) en se basant sur le dossier source ;
  5. Ajoutez tout de même (`npm link` ne le fait pas) votre nouveau module local dans le `package.json`, sans oublier la virgule à la fin de la ligne précédente :

```json
{
  "name": "simple-brunch",
  "version": "0.1.0",
  "private": true,
  "devDependencies": {
    "brunch": "^1.8.3",
    "jade-brunch": "^1.8.1",
    "javascript-brunch": "^1.7.1",
    "sass-brunch": "^1.8.10",
    "git-sha-brunch": "^1.8.0"
  }
}
```

Sans ça, Brunch ne le verra pas (il itère sur `package.json`, par sur le contenu de `node_modules`).

Si vous n'avez pas récupéré le dépôt par un `git clone`, vous n'êtes pas dans un dépôt Git.  Si vous avez Git d'installé, voici comment obtenir un HEAD vite fait :

```sh
$ git init
Initialized empty Git repository in …/6-templates/.git/
$ git commit --allow-empty -m "Initial commit"
[master (root-commit) 8dfa8d9] Initial commit
```

(Bien évidemment, vous n'aurez pas le même SHA.)

Une fois prêts, ouvrez par exemple, dans ce même dossier, `app/application.js`, et rajoutez à un ou deux endroits un commentaire du style `// Version: !GIT-SHA!`.  Sauvez.  Lancez le build.  Puis regardez le contenu du module en bas de `public/app.js` : le SHA a remplacé le marqueur.  Vous pouvez essayez pendant que le *watcher* tourne, aussi : ça marche ! ᕙ(⇀‸↼‶)ᕗ

----

« Précédent : [Des plugins pour tous les besoins de build](chapter11-plugins.md) • Suivant : [Conclusion](chapter13-conclusion.md) »
