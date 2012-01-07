async = require 'async'
{exec} = require 'child_process'
fs = require 'fs'
mkdirp = require 'mkdirp'
path = require 'path'
fs_utils = require './fs_utils'
helpers = require './helpers'
testrunner = require './testrunner'

# Creates an array of languages that would be used in brunch application.
# 
# config - parsed app config
# 
# Examples
# 
#   getLanguagesFromConfig {files: {
#     'out1.js': {languages: {'\.coffee$': CoffeeScriptLanguage}}
#   # => [/\.coffee/, 'out1.js', coffeeScriptLanguage]
# 
# Returns array.
getLanguagesFromConfig = (config) ->
  languages = []
  for destinationPath, settings of config.files
    for regExp, language of settings.languages
      try
        languages.push {
          regExp: ///#{regExp}///, destinationPath,
          compiler: new language config
        }
      catch error
        helpers.logError """[Brunch]: cannot parse config entry 
config.files['#{destinationPath}'].languages['#{regExp}']: #{error}.
"""
  languages

# Recompiles all files in current working directory.
# 
# rootPath - path to application directory.
# buildPath - (optional) path to application output directory. Default: 'build'
# config - Parsed app config.
# persistent - Should watcher be stopped after compiling the app first time?
# callback - Callback that would be executed on each compilation.
# 
watchApplication = (rootPath, buildPath, config, persistent, callback) ->
  if typeof buildPath is 'object'
    [config, persistent, callback] = [buildPath, config, persistent]
    buildPath = null
  buildPath ?= path.join rootPath, 'build'

  # Pass rootPath & buildPath to config in order to allow plugins to use them.
  config.rootPath = rootPath
  config.buildPath = buildPath

  helpers.startServer config.port, config.buildPath if config.port

  plugins = config.plugins.map (plugin) -> new plugin config
  languages = getLanguagesFromConfig config
  writer = new fs_utils.FileWriter buildPath, config.files
  watcher = (new fs_utils.FSWatcher ['app', 'vendor'])
    .on 'change', (file) ->
      languages
        .filter (language) ->
          language.regExp.test file
        .forEach (language) ->
          {compiler, destinationPath} = language
          compiler.compile file, (error, data) ->
            if error?
              # TODO: (Coffee 1.2.1) compiler.name.
              languageName = compiler.constructor.name.replace 'Language', ''
              return helpers.logError "
[#{languageName}]: cannot compile '#{file}': #{error}"
            writer.emit 'change', {destinationPath, path: file, data}
    .on 'remove', (file) ->
      writer.emit 'remove', file
  writer.on 'error', (error) ->
    helpers.logError "[Brunch] write error. #{error}"
  writer.on 'write', (result) ->
    async.forEach plugins, (plugin, next) ->
      plugin.load next
    , (error) ->
      return helpers.logError "[Brunch]: plugin error. #{error}" if error?
      helpers.log "[Brunch]: compiled."
      watcher.close() unless persistent
      callback result
  watcher

# Create new application in `rootPath` and build it.
# App is created by copying directory `../template/base` to `rootPath`.
exports.new = (rootPath, buildPath, callback = (->)) ->
  callback = buildPath if typeof buildPath is 'function'

  templatePath = path.join __dirname, '..', 'template', 'base'
  path.exists rootPath, (exists) ->
    if exists
      return helpers.logError "[Brunch]: can\'t create project: 
directory \"#{rootPath}\" already exists"
    console.log 'mkdirp'
    mkdirp rootPath, 0755, (error) ->
      return helpers.logError "[Brunch]: Error #{error}" if error?
      mkdirp buildPath, 0755, (error) ->
        return helpers.logError "[Brunch]: Error #{error}" if error?
        fs_utils.recursiveCopy templatePath, rootPath, ->
          helpers.log '[Brunch]: created brunch directory layout'
          helpers.log '[Brunch]: installing npm packages...'
          process.chdir rootPath
          exec 'npm install', (error) ->
            if error?
              helpers.logError "[Brunch]: npm error: #{error}"
              return callback error
            helpers.log '[Brunch]: installed npm package brunch-extensions'
            callback()

# Build application once and execute callback.
exports.build = (rootPath, buildPath, config, callback = (->)) ->
  watchApplication rootPath, buildPath, config, no, callback

# Watch application for changes and execute callback on every compilation.
exports.watch = (rootPath, buildPath, config, callback = (->)) ->
  watchApplication rootPath, buildPath, config, yes, callback

# Generate new controller / model / view and its tests.
# 
# rootPath - path to application directory.
# type - one of: collection, model, router, style, view
# name - filename.
# 
# Examples
# 
#   generate './twitter', 'style', 'user'
#   generate '.', 'view', 'user'
#   generate '.', 'collection', 'users'
# 
exports.generate = (rootPath, type, name, callback = (->)) ->
  extension = switch type
    when 'style' then 'styl'
    when 'template' then 'eco'
    else 'coffee'
  filename = "#{name}.#{extension}"
  filePath = path.join rootPath, 'app', "#{type}s", filename
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
    callback()
