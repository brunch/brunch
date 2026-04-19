# Le Guide de Brunch.io

*[English version and translations list here](../../README.md)*

Ceci est une tentative de fournir un guide raisonnablement complet pour [Brunch](http://brunch.io/), un excellent builder pour des applications web front, qui s'avère souvent très supérieur à Grunt, Gulp, Broccoli et compagnie.  Je l’ai adapté de [mon article de début mars 2015](http://www.js-attitude.fr/2015/03/04/brunch-mon-builder-prefere/).

## Table des Matières

1. [Brunch?! C’est quoi, Brunch ?](chapter01-whats-brunch.md)
  * [Brunch face aux autres](chapter01-whats-brunch.md#brunch-face-aux-autres)
  * [Exécuteurs de tâches vs. outils de build](chapter01-whats-brunch.md#exécuteurs-de-tâches-vs-outils-de-build)
  * [Traitements de fichiers vs. pipelines](chapter01-whats-brunch.md#traitements-de-fichiers-vs-pipelines)
  * [Configuration et boilerplate vs. conventions](chapter01-whats-brunch.md#configuration-et-boilerplate-vs-conventions)
  * [Builds intégraux vs. builds incrémentaux](chapter01-whats-brunch.md#builds-intégraux-vs-builds-incrémentaux)
  * [L’importance primordiale de la vitesse](chapter01-whats-brunch.md#limportance-primordiale-de-la-vitesse)
  * [Mais alors pourquoi entend-on seulement parler des autres ?](chapter01-whats-brunch.md#mais-alors-pourquoi-entend-on-seulement-parler-des-autres)
2. [Démarrer avec Brunch](chapter02-getting-started.md)
  * [Faut-il partir d’un squelette ?](chapter02-getting-started.md#faut-il-partir-dun-squelette)
3. [Conventions et valeurs par défaut](chapter03-conventions-and-defaults.md)
  * [Traitements prédéfinis](chapter03-conventions-and-defaults.md#traitements-prédéfinis)
  * [Fichiers de configuration](chapter03-conventions-and-defaults.md#fichiers-de-configuration)
  * [Dossiers](chapter03-conventions-and-defaults.md#dossiers)
  * [Enrobage CommonJS](chapter03-conventions-and-defaults.md#enrobage-commonjs)
  * [Sourcemaps](chapter03-conventions-and-defaults.md#sourcemaps)
  * [Surveillance des sources](chapter03-conventions-and-defaults.md#surveillance-des-sources)
  * [Serveur web intégré](chapter03-conventions-and-defaults.md#serveur-web-intégré)
  * [Chargement des plugins](chapter03-conventions-and-defaults.md#chargement-des-plugins)
4. [Partir de zéro](chapter04-starting-from-scratch.md)
  * [Envie de suivre facilement ?](chapter04-starting-from-scratch.md#envie-de-suivre-facilement)
  * [Juste quelques fichiers](chapter04-starting-from-scratch.md#juste-quelques-fichiers)
  * [Installer les plugins Brunch pour démarrer](chapter04-starting-from-scratch.md#installer-les-plugins-brunch-pour-démarrer)
  * [Notre premier build](chapter04-starting-from-scratch.md#notre-premier-build)
  * [Des globales ; parce que d’abord.](chapter04-starting-from-scratch.md#des-globales-parce-que-dabord)
  * [Revenir aux modules](chapter04-starting-from-scratch.md#revenir-aux-modules)
  * [Cibles multiples](chapter04-starting-from-scratch.md#cibles-multiples)
5. [Utiliser des référentiels de modules tiers](chapter05-using-third-party-registries.md)
6. [Un petit coup de *templating*](chapter06-a-shot-at-templating.md)
7. [Adapter Brunch à un projet existant](chapter07-using-brunch-on-legacy-code.md)
8. [Builds de développement et de production](chapter08-production-builds.md)
9. [*Watcher*](chapter09-watcher.md)
10. [Serveur web, intégré ou personnalisé](chapter10-web-server.md)
  * [Écrire notre propre serveur](chapter10-web-server.md#écrire-notre-propre-serveur)
  * [Et on n’est pas obligés de le faire en Node…](chapter10-web-server.md#et-on-nest-pas-obligés-de-le-faire-en-node)
11. [Des plugins pour tous les besoins de build](chapter11-plugins.md)
  * [Activation d’un plugin](chapter11-plugins.md#activation-dun-plugin)
  * [Affinage éventuel par configuration](chapter11-plugins.md#affinage-éventuel-par-configuration)
  * [Brunch et les CSS](chapter11-plugins.md#brunch-et-les-css)
  * [Brunch et JavaScript](chapter11-plugins.md#brunch-et-javascript)
  * [Brunch et les templates](chapter11-plugins.md#brunch-et-les-templates)
  * [Brunch et le workflow de développement](chapter11-plugins.md#brunch-et-le-workflow-de-développement)
  * [Brunch et la performance web](chapter11-plugins.md#brunch-et-la-performance-web)
12. [Réaliser un plugin Brunch](chapter12-writing-a-plugin.md)
13. [Conclusion](chapter13-conclusion.md)

## Version de Brunch

Ce guide a été écrit pour Brunch 1.8.3.  La majorité du contenu devrait fonctionner dans les versions 1.7.x précédentes, ceci dit ; quoi qu’il en soit, vous devriez mettre à jour !

## Licence

Ce guide est © 2015 Christophe Porteneuve, sous [licence MIT](../../LICENSE).

## Contribuer

J’accueille avec plaisir tout type de contribution : fautes de frappe, correctifs de bug, reformulations, meilleures explications, meilleurs exemples, infos complémentaires, démos, traductions, etc.

Assurez-vous de consulter nos [règles de contribution](../../CONTRIBUTING.md) !

## Remerciements

[L’équipe de Brunch](https://github.com/orgs/brunch/people) mérite toute notre gratitude et nos applaudissements pour leur extraordinaire boulot sur cet outil.  J’écris ceci alors que Brunch fête—déjà—ses 4 ans, et il m’a énormément simplifié la vie (et celles de centaines de mes stagiaires JS) tout ce temps-là ! Vous déchirez, les gars !
