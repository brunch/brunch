# auto-reload-brunch 2.1.0 (Mar 7, 2016)
* Introduce experimental live JS reload functionality. See README for more details and caveats.

# auto-reload-brunch 2.0.0 (Jan 29, 2016)
* Updated source code & API. The plugin would now only work with Brunch 2.2 and higher.

# auto-reload-brunch 1.8.1 (15 October 2015)
* Updated ws dependency to 0.8.0

# auto-reload-brunch 1.8.0 (5 June 2015)
* Fixed invalid CSS selector.

# auto-reload-brunch 1.7.8 (5 March 2015)
* Added support for wss. Specify your SSL cert like this: `keyPath` and `certPath`
* Added support for `data-autoreload=false` on `<link>` stylesheets.

# auto-reload-brunch 1.7.7 (4 March 2015)
* Updated `ws` to 0.7.
* Added `host` option.
* Added `forceRepaint` option.
* Fixed repaints for the latest chrome

# auto-reload-brunch 1.7.6 (26 January 2015)
* Automatically use `localhost` as the host if not specified by the user
  and `window.location.hostname` does not resolve to anything.
  * Makes it work with NW.js (fka node-webkit) out of the box

# auto-reload-brunch 1.7.5 (18 October 2014)
* Fix bug with custom port arrays and recent 0.11.x versions of node.js

# auto-reload-brunch 1.7.4 (26 September 2014)
* Fix automatic port collision resolution
* Explicitly trigger browser repaint on style updates

# auto-reload-brunch 1.7.3 (27 February 2014)
* Fix include script regression bug

# auto-reload-brunch 1.7.2 (26 February 2014)
* Updated `ws` module.

# auto-reload-brunch 1.7.1 (2 November 2013)
* Added `delay` option

# auto-reload-brunch 1.7.0 (28 September 2013)
* Automatically change port setting on client-side to match server's
* Client auto-reconnect, so manual refresh is not needed after a brunch restart
* Fine-grained enable settings to customize what types of changes trigger an
  auto-reload.
* Port setting can be an array for automatic recovery from port conflicts

# auto-reload-brunch 1.6.5 (28 August 2013)
* Added `enabled` option.

# auto-reload-brunch 1.6.4 (24 July 2013)
* Handled more WebSocketServer errors.

# auto-reload-brunch 1.6.3 (11 May 2013)
* Added `teardown` API support.

# auto-reload-brunch 1.6.2 (6 May 2013)
* Fixed styles reloading in brunch 1.6.4+.

# auto-reload-brunch 1.6.1 (18 April 2013)
* Moved configuration to `config.plugins.autoReload` from `config.autoReload`.

# auto-reload-brunch 1.6.0 (7 April 2013)
* Enabled plugin by default.

# auto-reload-brunch 1.5.2 (19 March 2013)
* Added node 0.10 support, removed coffee-script dependency.

# auto-reload-brunch 1.5.1 (30 January 2013)
* Plugin is now disabled in production environment (w / --optimize).

# auto-reload-brunch 1.5.0 (13 January 2013)
* Improved installation process.

# auto-reload-brunch 1.4.0 (26 November 2012)
* Added ability to customize websocket server ip & port and remote server ip.

# auto-reload-brunch 1.3.2 (15 July 2012)
* Updated `ws` dependency to 0.4.20.

# auto-reload-brunch 1.3.1 (29 June 2012)
* Fixed `config.persistent` bug.

# auto-reload-brunch 1.3.0 (29 June 2012)
* Reloading became smarter. If you change stylesheet, the page itself
won't be reloaded etc.
* Added node.js 0.8 and 0.9 support.
* Package is now precompiled before every publishing to npm.

# auto-reload-brunch 1.2.0 (18 May 2012)
* Initial release.
