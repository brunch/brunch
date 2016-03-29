# Brunch: Getting started

**Getting started** | [**Commands**](./commands.md) | [**Config**](./config.md) | [**Plugins**](./plugins.md) | [**FAQ**](./faq.md)

*How to learn 95% of Brunch in 8 minutes? Follow the guide!*

### Creating your first project

So, you've installed node.js and brunch itself (`npm install -g brunch`).
You're probably starving at this point. Let's get *straight to the business*.

`brunch new` helps to init new Brunch project from one of
community-provided [skeletons](http://brunch.io/skeletons).
The popular "ES6 skeleton" may sound scary, but it's actually very modern and nice.
Let's try to create a new app from it!

Type `brunch new proj -s es6` in your shell prompt. Executing the command will:

* Create directory `proj`
* Clone git repo `git://github.com/brunch/with-es6.git` to the dir.
  The Git URL is basically full name of our `"es6"` skeleton.
* Run `npm install` to install app dependencies and brunch plugins

After the project is created, let's try to build it:

```
$ brunch build
01 Apr 10:45:30 - info: compiled initialize.js into app.js, copied index.html in 857ms
```

### Structure

After the app is there, let's take a quick look into project structure

```
README.md
app/
  assets/           // All files inside `assets` would be simply copied to `public` directory.
    index.html
  initialize.js     // The file
brunch-config.js    // Contains basic assumptions about the project, like paths and outputs.
node_modules
package.json        // Describes which dependencies and Brunch plugins your application uses.

public/             // The "output" Brunch will re-generate on every build.
  index.html        // This was simply copied from our `app/assets`
  app.js            // `app.js`, in turn, was generated from `initialize.js`.
  app.js.map        // Source mappings for simple debugging.
```

### Concatenation

Let's add a few files to our app, then build the app one more time:

```
$ echo "body {font-family: 'Comic Sans MS'}" > app/main.css
$ echo "console.log('Hello, world')" > app/logger.js
$ brunch build
01 Apr 10:50:10 - info: compiled 3 files into 2 files, copied index.html in 947ms
```

Let's inspect files in `public` to understand what happened at this point:

- `app.css` simply has content of `app/main.css` and nothing else
- `app.js` has require definition and contents of both `initialize.js` and `logger.js`.
  Each file is wrapped into a JS function, which defines a module. This
  allows us to do things like `require('./logger')`.

### Watching the Brunch. Serving the Brunch.

Executing `brunch build` every time seems to take too much effort. Instead, let's
just do `brunch watch --server`. The `watch` would **automatically & efficiently rebuild the
app on every change**. `--server` flag would also launch a HTTP server. The default
location for the server is `http://localhost:3333`, so open this URL in a browser
of your choice. You'll see our app and everything which was located in `public`
directory.

Since the shell console would be busy with `brunch watch` command, we'll need
to open a new window.

### Using third-party libraries

Let's try to add jQuery to our app. Brunch makes the process absolutely effortless.

Execute `npm install --save jquery`, while keeping still keeping our Brunch watcher running.
You may think that Brunch is too damn smart, but the command alone would not add
jQuery to our app - we'll need to use it somewhere too.

In any place of `initialize.js`, add the code:

```javascript
var $ = require('jquery');
console.log('Yo, just trying to use jQuery!', $('body'));
```

Check our tiny web-server @ `localhost:3333` - and the browser console would
output exactly what you've entered here. jQuery is working!
