# React live JS wrapper

*As noted on [babel-plugin-react-transforms](https://github.com/gaearon/babel-plugin-react-transform)'s readme, it's a **highly experimental** tech and you should not bet your project on it.*

Uses [livereactload](https://github.com/milankinen/livereactload)'s [babel react transform](https://github.com/gaearon/babel-plugin-react-transform) plugin to wrap React components into [react-proxy](https://github.com/gaearon/react-proxy) wrappers, in order to make live-reloading easier.

Also exposes a boilerplate piece of babel config via `react-livejs/config`, that can later be used as

```javascript
const liveJs = require('react-livejs/config');

// ...
babel: {
  presets: ['es2015', 'react'],
  env: {development: {plugins: [liveJs]}}
}
```

## Installation

Add **both** `react-livejs` and `babel-plugin-react-transform` to your `package.json`.

Then add a piece of babel config as mentioned previously.

http://github.com/goshakkk/brunch-livejs-reload-stage2 demoes this package with Brunch.
