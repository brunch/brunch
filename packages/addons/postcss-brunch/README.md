postcss-brunch
==============

Adds [PostCSS](https://github.com/ai/postcss) support to [brunch](https://github.com/brunch/brunch)


## Install

	npm install --save-dev postcss-brunch

## Add plugins

Add all plugins you want to use with PostCSS in your `package.json` file too. For example, here we add [Autoprefixer](https://github.com/ai/autoprefixer) and [CSS Wring](https://github.com/hail2u/node-csswring).

```javascript
{
  "postcss-brunch": "^2.0",
  "autoprefixer": "^6.3",
  "csswring": "^5.1"
}
```

Or, use `npm install --save-dev <plugin>` to get latest version in package.json.

Then, configure `postcss-brunch` in the `plugins` section of your `brunch-config` file, like so:

```javascript
plugins: {
  postcss: {
    processors: [
      require('autoprefixer')(['last 8 versions']),
      require('csswring')()
    ]
  }
}
```

You can add as many processors as you want. CSS will be parsed only once. See [PostCSS](https://github.com/ai/postcss) and each plugins docs.

### Options

You can specify [PostCSS options](https://github.com/postcss/postcss#options), such as custom parser for CSS:

```js
plugins: {
  postcss: {
    options: {
      parser: require('postcss-scss'),
    },
  },
},
```

### CSS Modules

You can use CSS Modules with postcss-brunch. To enable it, change your config to:

```javascript
module.exports = {
  // ...
  plugins: {
    postcss: {
      modules: true
    }
  }
};
```

You can also pass options directly to
[postcss-modules](https://github.com/css-modules/postcss-modules):

```javascript
module.exports = {
  // ...
  plugins: {
    postcss: {
      modules: {
        generateScopedName: '[name]__[local]___[hash:base64:5]'
      }
    }
  }
};
```

Then, author your styles like you normally would:

```css
.title {
  font-size: 32px;
}
```

And reference CSS class names by requiring the specific style into your javascript:

```javascript
var style = require('./title.css');

<h1 className={style.title}>Yo</h1>
```

Note: enabling `modules` does so for every stylesheet in your project, so it's all-or-nothing. Even the files you don't require will be transformed into CSS modules (aka will have obfuscated class names, like turn `.title` into `._title_fdphn_1`).

### Dependencies

You can pass options for [progeny](https://github.com/es128/progeny) which retrieves dependencies for the input CSS file.

For example, if you use [postcss-partial-import](https://github.com/jonathantneal/postcss-partial-import) plugin, your CSS files
prefixed with underscore and have `.css` extension. In this case, you need pass to progeny `prefix` option, so brunch can
properly rebuild your partials on their change.

```javascript
module.exports = {
   // ...
   plugins: {
      postcss: {
         progeny: {
            prefix: '_'
         }
      }
   }
}
```

## License

MIT
