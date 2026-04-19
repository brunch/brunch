# Cordova + Brunch + Babel/ES6

This is a modern JS skeleton for [Brunch](http://brunch.io), targeting hybrid applications with Cordova.

## Installation

Clone this repo manually or use `brunch new dir -s brunch/with-cordova`

## Getting started

* Install (if you don't have them):
    * [Node.js](http://nodejs.org): `brew install node` on OS X
    * [Brunch](http://brunch.io): `npm install -g brunch`
    * Cordova: `npm install -g cordova@6.0.0`
    * Brunch plugins and app dependencies: `npm install`
    * `ruby mobile.rb init` — to initialize a cordova project from `config.xml`
* Run:
    * `npm start` — watches the project with continuous rebuild. This will also launch HTTP server with [pushState](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history).
    * `npm run build` — builds minified project for production
    * `ruby mobile.rb run/emulate/build ios`
* Learn:
    * `cordova/www/` dir is fully auto-generated. Write your code in `app/` dir.
    * Place static files you want to be copied from `app/assets/` to `cordova/www/`.
    * [Brunch site](http://brunch.io), [Getting started guide](https://github.com/brunch/brunch-guide#readme)

## On Cordova

The Cordova directory is kept out of source control, as it's a good practice. The core piece of Cordova setup, a config, is kept in the repo.

Feel free to modify `config.xml` to suit your needs. You can also declare the plugins you need right in the config.

The skeleton provides a helper script to bootstrap the cordova app:

```sh
ruby mobile.rb init
```

And run it:

```sh
ruby mobile.rb run ios # (or `emulate`/`build` instead of run)
```
