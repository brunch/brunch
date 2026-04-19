# typescript-brunch [![Build Status](https://travis-ci.org/brunch/typescript-brunch.svg?branch=master)](https://travis-ci.org/brunch/typescript-brunch)

Adds TypeScript support to [Brunch](https://brunch.io).

## Usage

Install the plugin and TypeScript via NPM with `npm install --save-dev typescript-brunch typescript`.

Or, do manual install:

* Add `"typescript-brunch": "x.y"` to `package.json` of your brunch app. Pick a plugin version that corresponds to your major.minor (x.y) Brunch version. You still need to install TypeScript manually `npm install --save-dev typescript`.
* If you want to use git version of plugin, add
`"typescript-brunch": "github:brunch/typescript-brunch"`.

## brunch-config

If there is a `tsconfig.json` file present in the root of your project, the `compilerOptions` from that will be used as defaults.

Any options in your `brunch-config.js` or `brunch-config.coffee` will override those.

```js
module.exports = {
  // ...
  plugins: {
    brunchTypescript: {
      removeComments: true
    }
  }
};
```

If no options are provided, this plugin will default to the following:

```js
{
  target: "es5",
  module: "commonjs",
  emitDecoratorMetadata: true,
  experimentalDecorators: true
}
```

## Errors

From version 1.8.2 up to current version, this plugin may report TypeScript errors that you are not expecting. This is due to the fact that this plugin compiles each file separately in isolation, and doesn't take advantage of the full TypeScript project. As such there are some errors which may appear which are false positives.

Starting in 1.8.3 you could add an `ignoreErrors` property the plugin config object in the `brunch-config` file. This was an array of error numbers to ignore. Starting in 2.0.1, you can ignore all TypeScript errors by setting `ignoreErrors` to `true` (this was broken in 2.0.0). Setting it to an array still works as before.

We are hoping to support the full language service, at least for `brunch build` at some point, but until then, we recommend that you add `tsc --noEmit` to your test script or build script to catch proper errors within your project.

Just to note that this shouldn't affect any TypeScript support your editor/IDE provides, which should also allow you to identify real errors.

## Contributors

* [baptistedonaux](https://github.com/baptistedonaux "Baptiste Donaux")
* [colinbate](https://github.com/colinbate "Colin Bate")
* [xtity](https://github.com/xtity "xtity")
* [kripod](https://github.com/kripod "Kristóf Poduszló")
* [jpoehls](https://github.com/jpoehls "Joshua Poehls")


## License

The MIT License (MIT)

Copyright (c) 2017 Baptiste Donaux (http://www.baptiste-donaux.fr)

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
