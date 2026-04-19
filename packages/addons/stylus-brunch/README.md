# stylus-brunch

Adds [Stylus](http://learnboost.github.com/stylus/) support to
[Brunch](https://brunch.io).

The plugin includes [nib](http://tj.github.io/nib/) cross-browser mixins.

## Usage

Install the plugin via npm with `npm install --save-dev stylus-brunch`.

## Options

**You don't need to specify any options by default.**

### Use Plugin Middleware

You can include Stylus plugins with a config directive
`config.plugins.stylus.plugins` (array) with paths to require the needed
plugins.  You will have to include your plugin dependencies in `package.json`.

```js
module.exports = {
  // ...
  plugins: {
    stylus: {
      plugins: ['my-stylus-plugin']
    }
  }
};
```

If the plugin is module based you can import a specific member as a subarray.

```js
moduls.exports = {
  // ...
  plugins: {
    stylus: {
      plugins: ['my-stylus-plugin', ['my-module-plugin', 'member']]
    }
  }
};
```

Alternatively, you can pass a function.

```js
moduls.exports = {
  // ...
  plugins: {
    stylus: {
      plugins: [require('autoprefixer-stylus')({browsers: ['last 3 versions']})]
    }
  }
};
```


### Options

You can import your modules or Stylus sheets with a config directive
`config.plugins.stylus.imports` (array) with paths to your modules.

```js
moduls.exports = {
  // ...
  plugins: {
    stylus: {
      imports: ['']
    }
  }
};
```

Allow stylus files to include plain-css partials:

```js
moduls.exports = {
  // ...
  plugins: {
    stylus: {
      includeCss: true
    }
  }
};
```

### Debugging

Enable line number comments or FireStylus for Firebug debug messages (both are off by default)

```js
moduls.exports = {
  // ...
  plugins: {
    stylus: {
      linenos: true,
      firebug: true
    }
  }
};
```

### CSS Modules

Starting Brunch `<unreleased>`, you can use CSS Modules with stylus-brunch. To enable it, change your config to:

```js
module.exports = {
  // ...
  plugins: {
    stylus: {
      modules: true
    }
  }
};
```

Then, author your styles like you normally would:

```stylus
.title
  font-size: 32px
```

And reference CSS class names by requiring the specific style into your javascript:

```js
var style = require('./title.styl');

<h1 className={style.title}>Yo</h1>
```

Note: enabling `cssModules` does so for every stylesheet in your project, so it's all-or-nothing. Even the files you don't require will be transformed into CSS modules (aka will have obfuscated class names, like turn `.title` into `._title_fdphn_1`).

## License

The MIT License (MIT)
