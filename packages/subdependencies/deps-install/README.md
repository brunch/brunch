# deps-install

> Instantly check if node_modules match package.json versions. Returns list of pkgs that don't.

Inspired by [check-dependencies](https://github.com/mgol/check-dependencies), which itself has too many dependencies.

## Usage

> npm install deps-install

```javascript
const {checkDeps, installDeps} = require('deps-install');

(async () => {
  // rootPath must have package.json and node_modules
  const deps = await checkDeps(rootPath);
  console.log(deps.length > 0 ? 'Doing npm install' : 'All clear!');
  if (deps.length) await installDeps(rootPath);
})();
```

## License

MIT License (c) 2019, Paul Miller (https://paulmillr.com)
