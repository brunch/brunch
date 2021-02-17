## Brunch 4.0.0 (Feb 18, 2021)

* **Breaking:** Require node.js 12.13 or higher
* **Breaking:** Remove `node-browser-modules`:
    * This part of Brunch shimmed well-known node.js built-in modules
    and provided them for browsers - such as `buffer` and `util`
    * It increased Brunch package size massively and the modules themselves
    were outdated
    * Now, if you need to use "node.js" module, install proper shim from NPM
    * NPM packages can be used as before, this change only affects built-ins

## Brunch 3.0.0 (Dec 16, 2019)

* Make config optional; and you could have it in package.json
* Build speed-ups up to 1.5x for some cases.
* Built-in webserver is now using serve-handler from micro(1) webserver.
  Custom webservers are unaffected.
* **Breaking:** Require node.js 10.16 or higher
* **Breaking:** Remove Bower and AMD support
* **Breaking:** Remove support for CoffeeScript brunch configs,
  emit a command that would compile coffee file to js
* **Breaking:** New node.js API - use `brunch.build()` from node without hassle
* Decrease package size by a huge amount:
    * Update Chokidar to 3.0
    * Remove or integrate many dependencies
    * Update dependencies to latest versions

## Brunch 0.9 (Jan 10, 2012)
* Initial release with the current architecture.

See full changelog at [.github/full_changelog.md](./github/full_changelog.md)