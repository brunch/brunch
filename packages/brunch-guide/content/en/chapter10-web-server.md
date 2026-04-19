# Web server: built-in or custom

This is part of [The Brunch.io Guide](../../README.md).

Earlier in this guide, I mentioned that the watcher also lets you run a **web server** in the background, to serve the resulting files over HTTP.  Some client-side technologies do need to be served over HTTP(S) instead of from a regular file.  This also makes for shorter URLs…

There are two ways to run this server:

  * **Explicitly** through the command line: `brunch watch --server`, `brunch watch -s` or even `brunch w -s` (for that arcane feel);
  * **Through the `server` settings** in `brunch-config.js`.

The built-in server is provided through an npm module named `pushserve`, and is therefore a bit more than a bare-bones static file server: it offers CORS headers, systematic routing of unknown paths to `index.html` to make `pushState` easier, and more.

If you want that server to **always run** when the watcher starts, you just need to add this to your configuration:

```js
module.exports = {
  server: {run: true}
  // ...
}
```

If you want a **different port** than 3333, you can use the `-P` or `--port` CLI option, or the `server.port` setting.

## Writing your custom server

This is great already, but sometimes you’ll need **a few more features**, if only for **demo** or **training** purposes…  Let’s see how to **write our own server**, that would provide two REST API endpoints for us:

  * A POST on `/items` with a `title` field would add an entry;
  * A GET on `/items` would obtain the list of entries.

We’ll keep it simple and use good ol’ [Express](http://expressjs.com/), with the minimum set of modules we need to achieve this.

By default, Brunch will look for a `brunch-server.js` or `brunch-server.coffee` file for your custom server module, but you can use a different path with the `server.path` setting.

This module must **directly export a function** (default export, using `module.exports = `) with the following signature:

```js
yourFunction(port, path, callback)
```

Before Brunch 1.8, you had to export a `startServer` method on your exported object.  This still works, but you should go the simpler way now and export your function directly as the module’s default export.

When your server is up and ready ([to serve](http://www.thanatosrealms.com/war2/sounds/humans/peasant/ready.wav), ha ha), it calls `callback()` so **Brunch can resume its work**.  The server is **automatically stopped** when Brunch’s watcher terminates.

Here’s our example server.  I put this in the expected `brunch-server.js` file.

```js
'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const logger = require('morgan');
const Path = require('path');

// Our server start function
module.exports = function startServer(port, path, callback) {
  const app = express();
  const server = http.createServer(app);

  // We’ll just store entries sent through REST in-memory here
  const items = [];

  // Basic middlewares: static files, logs, form fields
  app.use(express.static(Path.join(__dirname, path)));
  app.use(logger('dev'));
  app.use(bodyParser.urlencoded({ extended: true }));

  // GET `/items` -> JSON for the entries array
  app.get('/items', (req, res) => {
    res.json(items);
  });

  // POST `/items` -> Add an entry using the `title` field
  app.post('/items', (req, res) => {
    const item = (req.body.title || '').trim();
    if (!item) {
      return res.status(400).end('Nope!');
    }

    items.push(item);
    res.status(201).end('Created!');
  })

  // Listen on the right port, and notify Brunch once ready through `callback`.
  server.listen(port, callback);
};
```

For this to work, you must first add the necessary modules in your `package.json`:

```sh
$ npm install --save-dev express body-parser morgan
```

Then we’ll let our `brunch-config.js` know about it, and make the server auto-run in watch mode, too:

```js
modules.exports = {
  server: {run: true}
  // ...
}
```

Let’s try watching:

```sh
$ brunch w
02 Mar 12:45:04 - info: application started on http://localhost:3333/
02 Mar 12:45:04 - info: compiled 3 files into 3 files, copied index.html in 269ms
```

Notice the custom server info in there.  Try loading `http://localhost:3333/` in your browser now: it works!  In order to test this more thoroughly, let’s adjust our `application.js` to use the server’s API:

```js
'use strict';

const $ = require('jquery');

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

The watcher picks our update right up, and if we refresh the page and look at the console, we should see this:

![Our developer tools console says this works!](../images/brunch-simple-json.png)

All good! (づ￣ ³￣)づ

## And not just Node, either…

A final setting you can use is `server.command`, which basically replaces all the other `server` settings: it lets you define a custom server-running command line, in case you want to write your own server using another tech, such as PHP, Ruby or Python…  You could go something like this:

```js
module.exports = {
  server: {command: "php -S 0.0.0.0:3000 -t public"}
  // ...
}
```

----

« Previous: [Watcher](chapter09-watcher.md) • Next: [Plugins for all your build needs](chapter11-plugins.md) »
