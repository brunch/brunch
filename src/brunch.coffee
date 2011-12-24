fs = require 'fs'
path = require 'path'
mkdirp = require 'mkdirp'
filewriter = require './filewriter'
helpers = require './helpers'
testrunner = require './testrunner'
languages = require './languages'
plugins = require './plugins'

exports.VERSION = require('./package').version

cfg = 
  plugins: [plugins.AssetsPlugin]
  files:
    'scripts/app.js':
      languages:
        '\.js$': languages.JavaScriptLanguage
        '\.coffee$': languages.CoffeeScriptLanguage
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

# Recompiles all files in current working directory.
# 
# buildPath - Path to applications build directory.
# once      - Should watcher be stopped after compiling the app first time?
# callback  - Callback that would be executed on each compilation.
#  
watchFile = (buildPath, once, callback) ->
  changedFiles = {}
  languages = []
  for destinationPath, settings of cfg.files
    for regExp, language of settings.languages
      languages.push [///#{regExp}///, destinationPath, new language cfg]

  # TODO: test if cwd has config.
  watcher = new helpers.Watcher
  writer = new filewriter.FileWriter cfg
  watcher
    .add('app')
    .add('vendor')
    .on 'change', (file) ->
      clearTimeout changedFiles[file] if changedFiles[file]?
      changedFiles[file] = setTimeout ->
        console.log "File #{file} was changed"
        languages
          .filter ([regExp, destinationPath, language]) ->
            regExp.test file
          .forEach ([regExp, destinationPath, language]) ->
            language.compile file, (error, data) ->
              if error?
                languageName = language.constructor.name.replace 'Language', ''
                return helpers.logError "[#{languageName}] error: #{error}"
              writer.emit 'change', {destinationPath, path: file, data}
      , 25
    .on 'remove', (file) ->
      writer.emit 'remove', file
  writer.on 'write', (result) ->
    # TODO: post-write.
    watcher.clear() if once
    callback result

exports.new = (rootPath, buildPath, callback = (->)) ->
  templatePath = path.join __dirname, '..', 'template', 'base'
  path.exists rootPath, (exists) ->
    if exists
      return helpers.logError "[Brunch]: can\'t create project: 
directory \"#{rootPath}\" already exists"

    # TODO: async.
    mkdirp rootPath, 0755, (error) ->
       mkdirp buildPath, 0755, (error) ->
         helpers.recursiveCopy templatePath, rootPath, ->
           helpers.log '[Brunch]: created brunch directory layout'
           callback()

exports.build = (buildPath, callback = (->)) ->
  watchFile buildPath, yes, callback

exports.watch = (buildPath, callback = (->)) ->
  watchFile buildPath, no, callback

exports.test = (callback = (->)) ->
  testrunner.run {}, callback

exports.generate = (type, name, callback = (->)) ->
  extension = switch type
    when 'style' then 'styl'
    when 'template' then 'eco'
    else 'coffee'
  filename = "#{name}.#{extension}"
  filePath = path.join 'app', "#{type}s", filename
  data = switch extension
    when 'coffee'
      genName = helpers.capitalize type
      className = helpers.formatClassName name
      "class exports.#{className} extends Backbone.#{genName}\n"
    else
      ''

  fs.writeFile filePath, data, (error) ->
    return helpers.logError error if error?
    helpers.log "Generated #{filePath}"
    callback?()
