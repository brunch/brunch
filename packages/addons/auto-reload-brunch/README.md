# auto-reload-brunch

Adds automatic browser reloading support to [Brunch] when using the `brunch watch` command.

The plugin uses WebSocket technology to pass `compile` events to browser.

## Usage

Install the plugin via npm with

```
npm install -S auto-reload-brunch
```

In most cases, `auto-reload-brunch` works out of the box without any further configuration. Stylesheet changes will be applied seamlessly, and any other changes will trigger a page refresh. To prevent a stylesheet from being reloaded automatically, set the `data-autoreload="false"` attribute on the stylesheet's link tag.

### Brunch plugin settings

If customization is needed or desired, settings can be modified in your brunch config file (such as `brunch-config.coffee`):

* __enabled__: _(Boolean or Object)_ Defaults to `true`
  - As a boolean, turn on Auto-Reloading for any change in your project, or off entirely.
  - As an object, enable Auto-Reloading for specific types of changes. Keys are the file extensions of compiled files (`js` or `css`) or `assets` to cover any other watched files that do not get compiled. When an object is used, only the types explicitly set to `true` will trigger an Auto-Reload.
* __port__: _(Integer or Array of Integers)_ Defaults to `[9485..9495]`
  - The port to run the WebSocket server on. It will be applied automatically on the server and the client.
  - If an array, it will use the first value, but automatically fail over to the next value in the array if the attempted port is already in use on the system. This allows multiple instances to run without conflict.
* __delay__: _(Integer, in milliseconds)_ Optional, no default
  - If your system is having race-condition type problems when the browser tries to reload immediately after a compile, use this to set a delay before the reload signal is sent.
* __host__: (Default: `'0.0.0.0'`) Server's host address.
* __forceRepaint__: (Default: `false`) forcefully repaint the page after stylesheets refresh. Enabled in Chrome by default to mitigate the issue when it doesn't always update styles.
* __keyPath__: Optional, no default.
  - Path to private key used for SSL.
* __certPath__: Optional, no default.
  - Path to public x509 certificate.
* __forcewss__: Optional, no default.
  - make the client always use `wss://` instead of `ws://`.

**Example:**

```js
module.exports = {
  // ...
  // All settings are optional
  plugins: {
    autoReload: {
      enabled: {
        css: true,
        js: true,
        assets: false
      },
      port: [1234, 2345, 3456],
      delay: require('os').platform() === 'win32' && 200,
      keyPath: 'path/to/ssl.key',
      certPath: 'path/to/ssl.crt',
      forcewss: true
    }
  }
};
```

### Client-side settings

If your `brunch watch` is running on a different machine than your preview screen, you can set `server` config variable to connect to a brunch/websocket server running at another ip address.

```html
<script>
  window.brunch = window.brunch || {};
  window.brunch.server = '192.168.1.2';
</script>
```

You can also set the port (single integer only) and/or disable auto-reload via client-side scripting, although generally it's a better idea to use brunch config for this:

```js
window.brunch['auto-reload'] = window.brunch['auto-reload'] || {};
window.brunch['auto-reload'].port = 1234
window.brunch['auto-reload'].disabled = true;
```

### Custom file extensions

You can configure what extensions count as stylesheet and javascript reloads. By default, any compile file with an extension other than `.css` or `.js` will do a full page reload. The `match` option allows you to issue efficient stylesheet-only reloads for other file extensions as well.

The value of `match.stylesheets` and `match.javascripts` is an [anymatch] set, and so can be a wildcard, regexp, function, or an array thereof.

```js
module.exports = {
  // ...
  plugins: {
    autoReload: {
      match: {
        stylesheets: ['*.css', '*.jpg', '*.png'],
        javascripts: ['*.js']
      }
    }
  }
};
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

<!-- References -->

[brunch]: http://brunch.io
[anymatch]: https://www.npmjs.com/package/anymatch
