# terser-brunch

Adds [Terser](https://github.com/terser-js/terser) support to [Brunch](https://brunch.io).

The plugin will minify your JavaScript files. Supports modern language features.

Previously known as `uglify-js-brunch`.

## Usage

Install the plugin via npm with `npm install --save-dev terser-brunch`.

To specify [Terser options](https://github.com/terser-js/terser#minify-options), use `config.plugins.terser` object, for example:

```js
module.exports = {
  // ...
  plugins: {
    terser: {
      mangle: false,
      compress: {
        global_defs: {
          DEBUG: false,
        },
      },
    },
  },
};
```

Joined files can be ignored and be passed-through, using `ignored` option:

```js
module.exports = {
  plugins: {
    terser: {
      ignored: /dont-minimize\.js/,
    },
  },
};
```

## License

The MIT License (MIT)
