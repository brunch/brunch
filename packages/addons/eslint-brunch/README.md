# eslint-brunch

Adds [ESLint](http://eslint.org) support to [Brunch](https://brunch.io).

## Usage

Install the plugin via npm with `npm install --save-dev eslint-brunch`.

Configuration settings can be set in any acceptable `.eslintrc.*` [configuration file formats](http://eslint.org/docs/user-guide/configuring#configuration-file-formats).
If no configuration file can be found, this plugin will fallback to default ESLint options.

```js
exports.plugins = {
  eslint: {
    config: {
      rules: {semi: 'never'},
    },
    pattern: /^src\/.*\.jsx?$/,
    warnOnly: false,
    formatter: 'table',
  },
};
```

## Options

| Option      | Type      | Optional  | Default             | Description                                                                                                 |
|-------------|-----------|:---------:|---------------------|-------------------------------------------------------------------------------------------------------------|
| `config`    | `Object`  | Yes       | `undefined`         | Options to pass to the ESLint engine ([docs](https://eslint.org/docs/developer-guide/nodejs-api#cliengine)) |
| `pattern`   | `RegExp`  | Yes       | `/^app\/.*\.jsx?$/` | Pattern of file paths to be processed                                                                       |
| `warnOnly`  | `Boolean` | Yes       | `true`              | Use `warn` logging level instead of `error`                                                                 |
| `formatter` | `String`  | Yes       | `'stylish'`         | Built-in formatter to use ([docs](https://eslint.org/docs/user-guide/formatters))                           |

## License

Licensed under the [MIT license](LICENSE.md).
