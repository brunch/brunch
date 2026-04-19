# serve-brunch

Starts a simple webserver. Used in [Brunch](http://brunch.io), but you can adapt it for your project too.

## Usage

```javascript
require('serve-brunch').serve({
  publicPath,
  port,     // default: 3333
  hostname, // default: localhost
  path,     // path to server.js file
  command,  // run a custom command instead of reading the file
});
```

## License

[The MIT License](https://github.com/paulmillr/mit) (c) 2016 Paul Miller (http://paulmillr.com)
