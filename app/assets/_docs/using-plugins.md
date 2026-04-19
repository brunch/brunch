# Brunch: Using plugins

Brunch uses Node.js plugins to provide compilation / linting / optimization functionality.

Brunch has a plugin ecosystem to achieve interoperability with various tools simply via [plugin API](/docs/plugins.html).

For example, if you use JavaScript files in your project,
you’ll need a plugin that adds JS support.
Same with styles, templates, minifiers, linters and much more.

<div class="toc-placeholder"></div>

## Kinds of plugins

Brunch plugins can fall into three broad categories (one plugin can belong to several at the same time!):

* **Compilers**.
  These are responsible for compiling your source files into something a browser would understand.
  For example, a CoffeeScript (to JS) compiler; or a Stylus (to CSS) compiler.

* **Linters**.
  These allow to prevent certain kinds of mistakes, or enforce a particular coding style, at the build time.

* **Optimizers**.
  As the name implies, they optimize compiled JS or CSS files.
  Examples of optimizers include: a JavaScript uglifier; a CSS prefixer and minifier.

You can browse some of the community-supported plugins in the [Plugins](/plugins) section.

## Installation

Plugins can be installed with a simple console command:

`npm install --save-dev sass-brunch` - would add `"sass-brunch": "^2.0.2"` to package.json of your brunch app.

Sometimes you'll want to use plugins which have not yet been published to NPM and are available only through GIT.
In this case you can specify Git URL for the command: `npm install --save-dev brunch/sass-brunch`.

To remove a plugin, just delete its line from `package.json`.
See [npm docs](http://npmjs.org/doc/json.html#dependencies) for more docs on packages.

## Configuration

Plugins are usable out-of-the-box.
However, sometimes you will need to customize how they work, to make them suit your application.
Refer to the plugin's `README` on details regarding configuration.

Typically it would go under the `config.plugins.<plugin>`:

```js
module.exports = {
  plugins: {
    babel: {
      presets: ['react']
    }
  }
}
```

## Order of execution

Plugins are executed in order they are specified in `package.json`: when they operate on the same files (usually target files), their order can impact their ability to work. For instance, [groundskeeper-brunch](https://www.npmjs.com/package/groundskeeper-brunch) requires running before any minifiers, as these will obfuscate some code constructs the former relies on to detect trimmable code.

## Advanced plugin features

There are some additional ways plugins can enhance your development experience.
Here are a few:

### Exporting JS from stylesheets

A CSS compiler plugin can choose to produce some JS output for each source file, *in addition* to the stylesheet.

One of the cases where it comes in handy is CSS modules:

```stylus
.button
  margin: 0
```

Which gets turned into something like:

```css
._button_xkplk_42 {
  margin: 0;
}
```

To make your JS component aware of the actual class name, a compiler can allow you to `require` that css file to get information about its class name mappings:

```js
const style = require('./button.styl');
// ...

// style.button will return the obfuscated class name (something like "_button_xkplk_42" perhaps)
<div className={style.button}>...</div>
```

Note: this example is real. CSS modules are supported by several core stylesheet compilers with a configuration option: [stylus-brunch](https://github.com/brunch/stylus-brunch#css-modules), [sass-brunch](https://github.com/brunch/sass-brunch#css-modules), and [css-brunch](https://github.com/brunch/css-brunch#css-modules).

### Asset compilation

Sometimes you will want to transform a different kind of file, one that doesn't fit into the Brunch's general JS/CSS/template flow.
One example of that would be compiling Jade into HTML.
Starting with Brunch 2.8, this is made available for plugins to implement.

## Tips

Don't include plugins for languages or technologies your app does not use. They may unnecessarily slow down the build process.
