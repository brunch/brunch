> ## 🚧 This Plugin Is Deprecated 🚧

> This plugin is deprecated in favor of built-in possibilities of [Brunch] (since `2.10`), which can handle CSS automatically. We recommend to remove it from `package.json`. For CSS modules please use [postcss-brunch].

# css-brunch

Adds CSS support to [Brunch].

## Usage

Install the plugin via npm with `npm install --save-dev css-brunch`.

Or, do manual install:

* Add `"css-brunch": "x.y.z"` to `package.json` of your brunch app. Pick a plugin version that corresponds to your minor (y) brunch version.
* If you want to use git version of plugin, add
`"css-brunch": "git+ssh://git@github.com:brunch/css-brunch.git"`.

### CSS Modules

Starting Brunch `<unreleased>`, you can use CSS Modules with css-brunch. To enable it, change your config to:

```js
module.exports = {
  // ...
  plugins: {
    css: {
      modules: true
    }
  }
};
```

You can also pass options directly to [postcss-modules](https://github.com/css-modules/postcss-modules):

```js
module.exports = {
  // ...
  plugins: {
    css: {
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

```js
var style = require('./title.css');

<h1 className={style.title}>Yo</h1>
```

Note: enabling `cssModules` does so for every stylesheet in your project, so it's all-or-nothing. Even the files you don't require will be transformed into CSS modules (aka will have obfuscated class names, like turn `.title` into `._title_fdphn_1`).

## License

The MIT License (MIT)

Copyright (c) 2012-2017 Paul Miller (http://paulmillr.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

<!-- References -->

[Brunch]: http://brunch.io
[postcss-brunch]: https://github.com/brunch/postcss-brunch
