# Skemata

Skemata is a small library for validating object structure and value types.
It was extracted during development of config validation for [Brunch](http://github.com/brunch/brunch).

### Sample use (straight from brunch)

```javascript
const v = skemata.v;
const configBaseSchema = v.object({
  paths: v.object({
    root: v.string.default('.'),
    public: v.string.default('public'),
    watched: v.array(v.string).default(['app', 'test', 'vendor']),
    ignored: v.deprecated(v.noop, 'moved to `config.conventions.ignored`'),
    assets: v.deprecated(v.noop, 'moved to `config.conventions.assets`'),
    test: v.deprecated(v.noop, 'moved to `config.conventions.test`'),
    vendor: v.deprecated(v.noop, 'moved to `config.conventions.vendor`'),
    config: v.string,
    packageConfig: v.string.default('package.json'),
    bowerConfig: v.string.default('bower.json')
  }).default({}),

  rootPath: v.deprecated(v.noop, 'moved to `config.paths.root`'),
  buildPath: v.deprecated(v.noop, 'moved to `config.paths.public`')
  // ...
});
```
