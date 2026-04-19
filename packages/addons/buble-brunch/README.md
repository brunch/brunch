# buble-brunch

Adds [Bublé](https://buble.surge.sh) support to [Brunch](http://brunch.io).

## Usage

Install the plugin via npm with `npm install --save-dev buble-brunch`.

Or, do manual install:

* Add `"buble-brunch": "~x.y.z"` to `package.json` of your Brunch app.
* If you want to use git version of plugin, use the GitHub URI
`"buble-brunch": "brunch/buble-brunch"`.

## Configuration

All configurations in the `plugins.buble` object will be passed directly to the
buble compiler, be sure to [check the available options](https://buble.surge.sh/guide/#using-the-javascript-api)!

```js
module.exports = {
  // ...
  plugins: {
    buble: {
      // ...
    }
  }
};
```

## License

The MIT License (MIT)

Copyright (c) 2017 Roberto Dip and Alberto Martínez

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
