# livescript-brunch

Adds [LiveScript](http://gkz.github.com/LiveScript/) support to [brunch](http://brunch.io).

## Usage

Install the plugin via npm with `npm install --save-dev livescript-brunch`.

Or, do manual install:

* Add `"livescript-brunch": "x.y.z"` to `package.json` of your brunch app. Pick a plugin version that corresponds to your minor (y) brunch version.
* If you want to use git version of plugin, add
`"livescript-brunch": "brunch/livescript-brunch"`.

## Configuration

You can pass `bare` and `const` options to compiler by setting them in your brunch config file:

```js
exports.config = {
  // other configs ...
  plugins: {
    livescript: {
      bare: false, // default is true
      const: true  // default is false
    }
  }
}
```

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
