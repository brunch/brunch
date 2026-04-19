# Brunch: Testing

<div class="toc-placeholder"></div>

## Unit testing

The current options for unit testing are:

* use your built bundle from `public` in node
* run unit tests in the browser

Currently, there is no way to run unit tests directly on node, but...
A better approach is in the works. 🚧

## Integration testing

For integration testing in the browser, there are no additional steps required.

This simple function will load all your files that are ending with the `-test` suffix (`user-view-test.coffee` etc).

```js
require.list()
  .filter(name => /-test$/.test(name))
  .forEach(require);
```
