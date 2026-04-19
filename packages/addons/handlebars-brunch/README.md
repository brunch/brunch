# handlebars-brunch

Adds [Handlebars](http://handlebarsjs.com/) support to [brunch](http://brunch.io).

## Usage

Install the plugin via npm with `npm install --save-dev handlebars-brunch`.

Or, do manual install:

* Add `"handlebars-brunch": "x.y.z"` to `package.json` of your brunch app. Pick a plugin version that corresponds to your minor (y) brunch version.
* If you want to use git version of plugin, add
`"handlebars-brunch": "git+https://github.com/brunch/handlebars-brunch.git"`.

## Options

If customization is needed or desired, settings can be modified in your brunch
config file (such as `brunch-config.js`):

* __overrides__: _(Function)_ No default. This function will receive the `handlebars` object which you can use to override [Handlebar's public API](https://github.com/wycats/handlebars.js/blob/7f6ef1dd38794f12aee33c76c04f604a7651810b/lib/handlebars/compiler/javascript-compiler.js#L10)
* __include__: _(Object)_ Handlebars javascript include file options.
  - __runtime__: _(Boolean)_ Default `true`. Runtime if true or full compiler if false.
  - __amd__: _(Boolean)_ Default `false`. If true, include the AMD version of the handlebars file.
  - __enabled__: _(Boolean)_ Default `true`. If false, do not automatically include any handlebars file.
* __pathReplace__: _(RegExp)_  Default `/^.*templates\//`. Sets the regular expression applied against the source file path to create the module name. Matched characters are removed.
* __namespace__: _(String or Function)_ No default. Defines a global namespace to bind templates to. If a function is provided, the path of each source file is provided as an argument and the function should return a string specifying the namespace that template should be attached to. Segmented namespaces such as `JST.Templates` are supported.
* __locals__: _(Object)_ `{}`. Data for static templates.

**Configuration example:**

```js
exports.config = {
  // ...
  plugins: {
    handlebars: {
      overrides: handlebars => {
        handlebars.JavaScriptCompiler.prototype.nameLookup = (parent, name, type) => {
          // Your custom nameLookup method.
        }
      },
      include: {
        runtime: false // include the full compiler javascript
      },
      pathReplace: /0^/, // match nothing, use full file path for module name
      locals: {
        // static data
      }
    }
  }
}
```

**Static compilation example**

Put your static content into `app/assets/your_name.hbs`.

Content of file `your_name.hbs`:

```html
<!DOCTYPE html>
<html lang="en">
<title>{{title}}</title>
```

In config define `locals`:

```js
exports.config = {
  // ...
  plugins: {
    handlebars: {
      locals: {
        title: 'Brunch is awesome!'
      }
    }
  }
  // ...
}
```

Output file content will be placed in `public/your_name.html`.

Content of `your_name.html`:

```html
<!DOCTYPE html>
<html lang="en">
<title>Brunch is awesome!</title>
```

## License

The MIT License (MIT)

Copyright (c) 2012-2017 Paul Miller (http://paulmillr.com) & Elan Shanker

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
