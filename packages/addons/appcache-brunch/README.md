# appcache-brunch

[Brunch][1] plugin which generates a [cache manifest][2] as part of the
`brunch build` process.

[1]: http://brunch.io
[2]: https://developer.mozilla.org/en-US/docs/HTML/Using_the_application_cache#The_cache_manifest_file

## Usage

Install the plugin via npm with `npm install --save-dev appcache-brunch`.

Or, do manual install:

* Add `"appcache-brunch": "x.y.z"` to `package.json` of your brunch app.
  Pick a plugin version that corresponds to your minor (y) brunch version.
* If you want to use git version of plugin, add
`"appcache-brunch": "git+ssh://git@github.com:brunch/appcache-brunch.git"`.

Specify [plugin settings](#settings) in config.coffee. For example:

```coffeescript
exports.config =
  # ...
  plugins:
    appcache:
      staticRoot: '/static'
      network: ['*']
      fallback: {}
```

Link to the manifest from each template. For example:

```html
<html manifest="/static/appcache.appcache">
```

## Settings

### appcache.staticRoot

The static media root, such as ".", "/static" or "http://static.example.com".

Default value : `'.'`

### appcache.ignore

A regular expression specifying paths to omit from the manifest.

Default value : `/[/][.]/` (hidden files and files in hidden directories are ignored)

### appcache.externalCacheEntries

An array of additionals URIs added to `CACHE` section. For example:

```coffeescript
externalCacheEntries: [
  'http://other.example.org/image.jpg'
  # ...
]
```

Default value : `[]`

### appcache.network

An array of resource URIs which require a network connection added to `NETWORK` section. For example:

```coffeescript
network: [
  'login.php'
  '/myapi'
  'http://api.twitter.com'
]
```

Default value : `["*"]`

### appcache.fallback

An object mapping resource URIs to fallback URIs added to `FALLBACK` section. For example:

```coffeescript
fallback:
  '/main.py': '/static.html'
  'images/large/': 'images/offline.jpg'
  '*.html': '/offline.html'
```

Default value : `{}`

### appcache.manifestFile

Output filename. For example:

```coffeescript
manifestFile: "appcache.appcache"
```

Default value : `"appcache.appcache"`

## License

The MIT License (MIT)

Copyright (c) 2012-2013 Paul Miller (http://paulmillr.com)

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
