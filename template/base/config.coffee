{plugins, languages} = require 'brunch'


exports.config =
  # Every plugin category could only have one value.
  # List of valid categories:
  # 
  # * CI: continuous integration system.
  # * MVC: a framework that would serve as skeleton of app.
  # * tests: testing framework
  #
  plugins:
    #CI: plugins.TravisPlugin
    MVC: plugins.BackbonePlugin
    tests: plugins.MochaPlugin
  # A list of languages that your application will support.
  # Specify them in format:
  # 
  #   'name of output file': 
  #     'file matching regexp': language class
  # 
  languages:
    'scripts/app.js':
      '\.eco$': languages.EcoLanguage
      #'\.jade$': languages.JadeLanguage
      #'\.mustache$': languages.MustacheLanguage
    'styles/app.css':
      '\.css$': languages.CSSLanguage
      '\.styl$': languages.StylusLanguage
      #'\.sass$': languages.SASSLanguage
      #'\.less$': languages.LESSLanguage
  # Specify ordering of compiling in format:
  # 
  #   'name of output file':
  #     before: [files that would be compiled before all scripts / styles]
  #     after: [files that would be compiled after all scripts / styles]
  # 
  order:
    'scripts/app.js':
      before: [
        'vendor/scripts/console-helper.js'
        'vendor/scripts/jquery-1.7.1.js'
        'vendor/scripts/underscore-1.1.7.js'
        'vendor/scripts/backbone-0.5.3.js'
      ]

    'styles/app.css':
      before: ['vendor/styles/normalize.css', 'vendor/styles/bootstrap.less']
      after: ['vendor/styles/helpers.css', 'app/styles/things.sass']
