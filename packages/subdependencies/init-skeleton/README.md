Deprecated: incorporated into Brunch 3

# init-skeleton

A simple interface that clones or copies skeletons.
skeleton is a base repo for your application (any technology).

`init-skeleton` currently just clones or copies the repository,
executes `npm install` and `bower install` and removes `.git` directory.
Useful for [Brunch](http://brunch.io) and
[Grunt](http://gruntjs.com) base repos (skeletons).

[grunt-init](https://github.com/gruntjs/grunt-init) is similar, except it
requires to clone projects to home directory before initialising from it.

Supported formats:

* File system
* Git URI
* GitHub URI (`gh:user/project`, `github:user/project`)

Install with npm: `npm install init-skeleton`.

## Usage

```javascript
const initSkeleton = require('init-skeleton').init;

initSkeleton('skeleton').then(() => {
  console.log('Cloned');
});
```

- `options`:
    - `rootPath` - `String`, root path of the result directory
    - `commandName`: `String`, defaults to `init-skeleton`
    - `logger`: `console.{log,error}`-compatible logger.


## License

[MIT](https://github.com/paulmillr/mit) (c) 2016 Paul Miller (http://paulmillr.com)
