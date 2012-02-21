{languages, plugins} = require 'brunch-extensions'

# Make config loadable via require() for brunch.
# See config docs at http://brunch.readthedocs.org/en/latest/config.html.
exports.config =
  # Uncomment and edit the next line to change default build path
  # buildPath: 'public'

  # Edit this to change extension & content of files, created by
  # `brunch generate`.
  defaultExtensions:
    script: 'coffee'
    style: 'styl'
    template: 'eco'

  # List of files that your application would generate.
  # List of included languages:
  # http://brunch.readthedocs.org/en/latest/plugins.html#default-languages
  files:
    'javascripts/app.js':
      languages:
        '\\.js$': languages.JavaScriptLanguage
        '\\.coffee$': languages.CoffeeScriptLanguage
        '\\.eco$': languages.EcoLanguage
      order:
        before: [
          'vendor/scripts/console-helper.js'
          'vendor/scripts/jquery-1.7.js'
          'vendor/scripts/underscore-1.3.1.js'
          'vendor/scripts/backbone-0.9.0.js'
        ]

    'styles/app.css':
      languages:
        '\\.css$': languages.CSSLanguage
        '\\.styl$': languages.StylusLanguage
      order:
        before: ['vendor/styles/normalize.css']
        after: ['vendor/styles/helpers.css']

  # List of included plugins:
  # http://brunch.readthedocs.org/en/latest/plugins.html#default-plugins
  plugins: [plugins.AssetsPlugin]
