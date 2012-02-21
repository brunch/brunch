async = require 'async'
{exec} = require 'child_process'
fs = require 'fs'
mkdirp = require 'mkdirp'
{ncp} = require 'ncp'
sysPath = require 'path'
fs_utils = require './fs_utils'
helpers = require './helpers'

# Creates an array of languages that would be used in brunch application.
# 
# config - parsed app config
# 
# Examples
# 
#   getLanguagesFromConfig {files: {
#     'out1.js': {languages: {'\.coffee$': CoffeeScriptLanguage}}
#   # => {
#     regExp: /\.coffee/,
#     destinationPath: 'out1.js',
#     compiler: coffeeScriptLanguage
#   }
# 
# Returns array.
exports.getLanguagesFromConfig = getLanguagesFromConfig = (config) ->
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
# config - Parsed app config.
# persistent - Should watcher be stopped after compiling the app first time?
# callback - Callback that would be executed on each compilation.
# 
# Returns `fs_utils.FSWatcher` object.
watchApplication = (rootPath, config, persistent, callback) ->
  config.buildPath ?= sysPath.join rootPath, 'public'
  config.server ?= {}
  config.server.port ?= 3333

  # Pass rootPath to config in order to allow plugins to use it.
  config.rootPath = rootPath
  
  helpers.startServer config.server.port, config.buildPath if config.server.run

  plugins = config.plugins.map (plugin) -> new plugin config
  languages = getLanguagesFromConfig config
  directories = ['app', 'vendor'].map (dir) -> sysPath.join rootPath, dir
  writer = new fs_utils.FileWriter config.buildPath, config.files, plugins
  watcher = (new fs_utils.FSWatcher directories)
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
    helpers.log "[Brunch]: compiled."
    watcher.close() unless persistent
    callback result
  watcher

# Create new application in `rootPath` and build it.
# App is created by copying directory `../template/base` to `rootPath`.
exports.new = (rootPath, buildPath, callback = (->)) ->
  callback = buildPath if typeof buildPath is 'function'
  buildPath ?= sysPath.join rootPath, 'build'

  templatePath = sysPath.join __dirname, '..', 'template', 'base'
  sysPath.exists rootPath, (exists) ->
    if exists
      return helpers.logError "[Brunch]: can\'t create project: 
directory \"#{rootPath}\" already exists"
    mkdirp rootPath, (parseInt 755, 8), (error) ->
      return helpers.logError "[Brunch]: Error #{error}" if error?
      mkdirp buildPath, (parseInt 755, 8), (error) ->
        return helpers.logError "[Brunch]: Error #{error}" if error?
        ncp templatePath, rootPath, (error) ->
          return helpers.logError error if error?
          helpers.log 'created brunch directory layout'
          helpers.log 'installing npm packages...'
          prevDir = process.cwd()
          process.chdir rootPath
          exec 'npm install', (error) ->
            process.chdir prevDir
            if error?
              helpers.logError "npm error: #{error}"
              return callback error
            helpers.log 'installed npm package brunch-extensions'
            callback()

# Build application once and execute callback.
exports.build = (rootPath, config, callback = (->)) ->
  watchApplication rootPath, config, no, callback

# Watch application for changes and execute callback on every compilation.
exports.watch = (rootPath, config, callback = (->)) ->
  watchApplication rootPath, config, yes, callback

# Generate new controller / model / view and its tests.
# 
# rootPath - path to application directory.
# type - one of: collection, model, router, style, template, view.
# name - filename.
# config - parsed app config.
# 
# Examples
# 
#   generate './twitter', 'style', 'user', config
#   generate '.', 'view', 'user', config
#   generate '.', 'collection', 'users', config
# 
exports.generate = (rootPath, type, name, config, callback = (->)) ->
  unless config.defaultExtensions
    callback()
    return helpers.logError "Cannot find `defaultExtensions` option in config."
  
  # We'll additionally generate tests for 'script' languages.
  languageType = switch type
    when 'collection', 'model', 'router', 'view' then 'script'
    else type

  extension = config.defaultExtensions[languageType]

  generateFile = (callback) ->
    name += "_#{type}" if type in ['router', 'view']
    filename = "#{name}.#{extension}"
    genName = helpers.capitalize type
    className = helpers.formatClassName name

    path = if languageType is 'template'
      sysPath.join rootPath, 'app', 'views', "#{type}s", filename
    else
      sysPath.join rootPath, 'app', "#{type}s", filename

    data = switch extension
      when 'coffee'
        "class exports.#{className} extends Backbone.#{genName}\n"
      when 'js'
        "exports.#{className} = Backbone.#{genName}.extend({\n\n});"
      else
        ''
    fs.writeFile path, data, (error) ->
      return helpers.logError error if error?
      helpers.log "Generated #{path}"
      callback()

  generateTests = (callback) ->
    # TODO: remove the spike.
    return callback() unless languageType is 'script'
    testDirPath = sysPath.join rootPath, 'test', 'unit', "#{type}s"
    testFilePath = sysPath.join testDirPath, "#{name}_test.#{extension}"
    write = ->
      fs.writeFile testFilePath, '', (error) ->
        return helpers.logError error if error?
        helpers.log "Generated #{testFilePath}"
        callback()
    sysPath.exists testDirPath, (exists) ->
      return write() if exists
      mkdirp testDirPath, (parseInt 755, 8), (error) ->
        return helpers.logError error if error?
        write()

  generateFile ->
    generateTests ->
      callback()
