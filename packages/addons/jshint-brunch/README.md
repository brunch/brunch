# jshint-brunch

Adds JSHint support to [brunch](http://brunch.io).

> This plugin is deprecated in favor of [eslint-brunch](https://github.com/brunch/eslint-brunch). Please switch to ESLint, a more modern replacement.

## Usage

Install the plugin via npm with `npm install --save-dev jshint-brunch`.

Or, do manual install:

* Add `"jshint-brunch": "x.y.z"` to `package.json` of your brunch app. Pick a plugin version that corresponds to your minor (y) brunch version.
* If you want to use git version of plugin, add
`"jshint-brunch": "git+ssh://git@github.com:brunch/jshint-brunch.git"`.

By default, only files in your `config.paths.app` are linted.

You can customize JSHint config by changing brunch config:

```js
module.exports = {
  plugins: {
    jshint: {
      pattern: /^app[\\\/].*\.js$/,
      options: {
        bitwise: true,
        curly: true
      },
      globals: {
        jQuery: true
      },
      warnOnly: true
    }
  }
};
```

Every sub-option (`pattern`, `options`, `globals`, `warnOnly`) is optional.

If `warnOnly` is set to true then JSHint errors will output as console warnings.
This allows the build process to continue rather than exiting on any linter errors.

Alternatively if you prefer to use a `.jshintrc` file, remove all JSHint options
from the brunch config and place your `.jshintrc` file in the same location as
your brunch config.

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
