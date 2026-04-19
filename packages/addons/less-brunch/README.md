## less-brunch
Adds [LESS](http://lesscss.org/) support to
[brunch](http://brunch.io).

## Usage
`npm install --save-dev less-brunch`

### Options
Pass options as per [lessc's documentation](http://lesscss.org/usage/index.html) in your `brunch-config`,
e.g. print source-file references in output by setting `dumpLineNumbers`.

```javascript
module.exports = {
  // ...
  plugins: {
    less: {
      dumpLineNumbers: 'comments' // other values: 'mediaquery', 'all'
      // ... other options
    }
  }
};
```
Note that some options are overwritten: `paths` and `filename` are set by the plugin.
In production mode line numbers are suppressed.


### CSS Modules
Starting Brunch `2.6`, you can use CSS Modules with less-brunch. To enable it, change your config to:

```javascript
module.exports = {
  // ...
  plugins: {
    less: {
      modules: true
    }
  }
};
```

Then, author your styles like you normally would:

```less
.title {
  font-size: 32px;
}
```

And reference CSS class names by requiring the specific style into your javascript:

```javascript
var style = require('./title.less');

<h1 className={style.title}>Yo</h1>
```

Note: enabling `cssModules` does so for every stylesheet in your project, so it's all-or-nothing. Even the files you don't require will be transformed into CSS modules (aka will have obfuscated class names, like turn `.title` into `._title_fdphn_1`).

## License

The MIT License (MIT)

Copyright (c) 2012 - 2015 Paul Miller (http://paulmillr.com) & Elan Shanker

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
