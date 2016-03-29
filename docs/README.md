# Brunch: Getting started

**Getting started** | [**Commands**](./commands.md) | [**Config**](./config.md) | [**Plugins**](./plugins.md) | [**FAQ**](./faq.md)

### Creating your first project

`brunch new` would help you to initialize a new Brunch project from one of
our [skeletons](http://brunch.io/skeletons). Let's pick popular ES6 skeleton and create a new app from it.

Do `brunch new proj -s es6` in your shell prompt. Executing the command will:

* Create directory `proj`
* Clone git repo `git://github.com/brunch/with-es6.git` to the dir;
  which is our skeleton aliased to `es6`
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

Let's add a few files to our app; then build the app one more time:

```
$ echo "body {font-family: 'Comic Sans MS'}" > app/main.css
$ echo "console.log('Hello, world')" > app/logger.js
$ brunch build
01 Apr 10:50:10 - info: compiled 3 files into 2 files, copied index.html in 947ms

```

### Concatenation

Brunch concatenates all your scripts in directories specified in
`config.paths.watched`. You set concatenation config, number of
output files in `config.files[type]`.

We suggest to have two files:

* `app.js` contains your application code.
* `vendor.js` contains code of libraries you depend on (e.g. jQuery).

This is better solution for browser caching than using one file,
because you change dependencies not as often as you change
your application code.

Order of file concatenation is:

1. Files in `config.files[type].order.before` in order you specify.
2. Bower components ordered automatically.
3. Files in `vendor/` directories in alphabetic order.
4. All other files in alphabetic order.
5. Files in `config.files[type].order.after` in order you specify.

All this stuff (conventions, name of out files etc) can be changed
via modifying config file.

### Conventions

Brunch also has conventions. Conventions are filters for files with special meaning. They can be changed via config.

* Static files in `assets/` dirs are copied directly to `public/`.
* Any scripts in `app/` dirs are wrapped by default into modules. These modules are Common.JS / AMD abstractions that allow you to simply get rid of global vars as to avoid polluting the global namespace. This is especially useful for larger projects. Any module that you need to use in the browser will have to be loaded with the `require('')` function. For example, if you have a script `app/views/user_view`, then you could load that in your html file using `<script>require('views/user_view')</script>`. File extensions are optional here.
* Scripts in `vendor/` dirs aren't wrapped in modules and as such do not require any further loading instructions.
* Files whose name start with `_` (underscore) are ignored by compiler. They're useful for languages like sass / stylus, where you import all substyles in main style file.
