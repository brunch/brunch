# clean-css-brunch

Adds [clean-css](https://github.com/GoalSmashers/clean-css) support to
[brunch](https://brunch.io).

The plugin will minify your CSS files.

## Usage

Install the plugin via npm with `npm install -S clean-css-brunch`.

## Options

[See all possible options in the CleanCSS API](https://github.com/jakubpawlowicz/clean-css#how-to-use-clean-css-api).

To specify clean-css options, use `config.plugins.cleancss` object, for example:

```js
module.exports = {
  plugins: {
    cleancss: {
      specialComments: 0,
      removeEmpty: true
    }
  }
};
```

Joined files can be ignored and be passed-through, using 'ignored' option:

```js
module.exports = {
  plugins: {
    cleancss: {
      ignored: /non_minimize\.css/
    }
  }
};
```

## License

The MIT License (MIT)
