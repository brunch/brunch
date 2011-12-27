{languages, plugins} = require 'brunch-extensions'

exports.config =
  plugins: [plugins.AssetsPlugin]
  files:
    'scripts/app.js':
      languages:
        '\.js$': languages.JavaScriptLanguage
        '\.coffee$': languages.CoffeeScriptLanguage
        '\.eco$': languages.EcoLanguage
      order:
        before: [
          'vendor/scripts/console-helper.js'
          'vendor/scripts/jquery-1.7.js'
          'vendor/scripts/underscore-1.1.7.js'
          'vendor/scripts/backbone-0.5.3.js'
        ]

    'styles/app.css':
      languages:
        '\.css$': languages.CSSLanguage
        '\.styl$': languages.StylusLanguage
      order:
        before: ['vendor/styles/normalize.css']
        after: ['vendor/styles/helpers.css']
