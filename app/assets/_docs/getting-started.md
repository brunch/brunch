# Brunch: Getting started

*How to learn 90% of Brunch in 8 minutes? Follow the guide!*

<div class="toc-placeholder"></div>

---

## Tasting your first Brunch

So, you've installed Node.js and Brunch itself (`npm install -g brunch`).
You're probably starving at this point. Let's get *straight to the business*.

`brunch new` helps to init new Brunch project from one of
community-provided [skeletons](http://brunch.io/skeletons).
The popular "ES6 skeleton" may sound scary, but it's actually very modern and nice.
Let's try to create a new app from it!

Type

```sh
$ brunch new proj -s es6
```

 in your shell prompt. Executing the command will:

* Create directory `proj`
* Clone git repo `git://github.com/brunch/with-es6.git` to the dir.
  The Git URL is basically full name of our `"es6"` skeleton.
* Run `npm install` to install app dependencies and brunch plugins

After the project is created, let's try to build it:

```sh
$ brunch build
01 Apr 10:45:30 - info: compiled initialize.js into app.js, copied index.html in 857ms
```

## What is the dish made of?

The app is there, let's take a quick look into the project's structure

```
README.md
app/
  assets/           // Files inside `assets` would be simply copied to `public` dir.
    index.html
  initialize.js
brunch-config.js    // Basic assumptions about the project, like paths & outputs.
node_modules
package.json        // Describes which dependencies and Brunch plugins your app uses.

public/             // The "output" Brunch will re-generate on every build.
  index.html        // This was simply copied from our `app/assets`
  app.js            // `app.js`, in turn, was generated from `initialize.js`.
  app.js.map        // Source mappings for simple debugging.
```

## Pouring some syrup

Let's add a few files to our app, then build the app one more time:

```sh
$ echo "body {font-family: 'Comic Sans MS'}" > app/main.css
$ echo "console.log('Hello, world')" > app/logger.js
$ brunch build
01 Apr 10:50:10 - info: compiled 3 files into 2 files, copied index.html in 947ms
```

Let's inspect files in `public` to understand what happened at this point:

* `app.css` simply has content of `app/main.css` and nothing else
* `app.js` has require definition and contents of both `initialize.js` and `logger.js`. Each file is wrapped into a JS function, which defines a module. This allows us to do things like `require('./logger')`. Indeed, your `logger.js` file will not execute without you first requiring it inside `initialize.js`, so go ahead and require it in `initialize.js`. You can use the require command as follows, `require('./logger')`.

## Serving the Brunch

Executing `brunch build` every time seems to take too much effort. Instead, let's just do 

`brunch watch --server`

The `watch` would **automatically & efficiently rebuild the app on every change**. `--server` flag would also launch a HTTP server. The default location for the server is [`http://localhost:3333`](http://localhost:3333), so open this URL in a browser of your choice. You'll see our app and everything which was located in `public` directory.

Since the shell console would be busy with `brunch watch` command, we'll need to open a new window.

## Including third-party ingredients

Let's try to add **jQuery** to our app. Brunch makes the process *absolutely effortless*.

Execute `npm install --save jquery`, while keeping our Brunch watcher running.
You may think that Brunch is too damn smart, but the command alone would not add
jQuery to our app - we'll need to use it somewhere too.

Add the following code anywhere in `initialize.js`:

```js
var $ = require('jquery');
console.log('Tasty Brunch, just trying to use jQuery!', $('body'));
```

Check our tiny web-server at [`localhost:3333`](http://localhost:3333) - and the browser console would
output exactly what you've entered here. jQuery is up and running now.

## Plugging alternative tableware

Let's say you want to try the new fancy **ECMAScript 201X** thing. Maybe your OCD would be eased by conforming
to 66 **ESLint** rules. It doesn't matter, [more than 50 Brunch plugins](http://brunch.io/plugins) aim to help with all kinds of crazy cases.

Install Babel plugin by executing `npm install --save-dev babel-brunch`.
Hmm...that's exactly the same command from our previous step. Whatever. Let's create the `index.js` file with some content:

```
$ echo 'console.log([1, 2, 3].reduce((s, n) => s + n ** 2))' > app/index.js
```

Since you've added Babel plugin to the board, Brunch would *magically* recompile the app and include *compiled* content of `index.js` in the output file. **Voila!**

## Becoming a professional cook

Keen to learn the remaining 10%? Check out the [advanced guide to Brunch](https://github.com/brunch/brunch-guide#readme), which also describes using Brunch on a legacy codebase. Happy cooking!
