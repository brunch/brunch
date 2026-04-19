```js
exports.files = {
  javascripts: {
    joinTo: {
      'vendor.js': /^(?!app)/,
      'app.js': /^app/
    }
  },
  stylesheets: {joinTo: 'app.css'}
};

exports.plugins = {
  babel: {presets: ['latest', 'react']},
  postcss: {processors: [require('autoprefixer')]}
};
```

`package.json`:

```js
{
  "devDependencies": {
    "brunch": "^2",
    "babel-brunch": "^6",
    "postcss-brunch": "^2",
    "sass-brunch": "^2",
    "uglify-js-brunch": "^2",
    "autoprefixer": "^6",
    "babel-preset-react": "^6",
    "babel-preset-latest": "^6"
  }
}
```

Both configs are functionally similar.

The example is meant to highlight the difference in terms of boilerplate for a pretty common front-end dev setup, as well as in terms of approaches (imperative vs declarative).

Take a look at [the docs](/docs/getting-started.html) to learn more about Brunch.
