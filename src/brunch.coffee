async = require 'async'
{exec} = require 'child_process'
fs = require 'fs'
mkdirp = require 'mkdirp'
path = require 'path'
file = require './file'
helpers = require './helpers'
testrunner = require './testrunner'

getLanguagesFromConfig = (config) ->
  languages = []
  for destinationPath, settings of config.files
    for regExp, language of settings.languages
      try
        lang = [///#{regExp}///, destinationPath, new language config]
        languages.push lang
      catch error
        helpers.logError """[Brunch]: cannot parse config entry 
config.files['#{destinationPath}'].languages['#{regExp}']: #{error}.
"""
  languages
  
# Recompiles all files in current working directory.
# 
# config    - Parsed app config.
# once      - Should watcher be stopped after compiling the app first time?
# callback  - Ca=llback that would be executed on each compilation.
#  
watchFile = (config, once, callback) ->
  changedFiles = {}
  plugins = config.plugins.map (plugin) -> new plugin config
  languages = getLanguagesFromConfig config

  helpers.startServer config.port, config.buildPath if config.port
  # TODO: test if cwd has config.
  watcher = new file.FileWatcher
  writer = new file.FileWriter config
  watcher
    .add('app')
    .add('vendor')
    .on 'change', (file) ->
      languages
        .filter ([regExp, destinationPath, language]) ->
          regExp.test file
        .forEach ([regExp, destinationPath, language]) ->
          language.compile file, (error, data) ->
            if error?
              languageName = language.constructor.name.replace 'Language', ''
              return helpers.logError "[#{languageName}] error: #{error}"
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
      helpers.log '[Brunch]: compiled.'
      watcher.clear() if once
      callback result

exports.new = (rootPath, buildPath, callback = (->)) ->
  templatePath = path.join __dirname, '..', 'template', 'base'
  path.exists rootPath, (exists) ->
    if exists
      return helpers.logError "[Brunch]: can\'t create project: 
directory \"#{rootPath}\" already exists"

    mkdirp rootPath, 0755, (error) ->
      return helpers.logError "[Brunch]: Error #{error}" if error?
      mkdirp buildPath, 0755, (error) ->
        return helpers.logError "[Brunch]: Error #{error}" if error?
        file.recursiveCopy templatePath, rootPath, ->
          helpers.log '[Brunch]: created brunch directory layout'
          helpers.log '[Brunch]: installing npm packages...'
          exec "pushd . && cd #{rootPath} && npm install && popd", (error) ->
            if error?
              helpers.logError "[Brunch]: npm error: #{error}"
              return callback error
            helpers.log '[Brunch]: installed npm package brunch-extensions'
            callback()

exports.build = (config, callback = (->)) ->
  watchFile config, yes, callback

exports.watch = (config, callback = (->)) ->
  watchFile config, no, callback

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
    callback()
