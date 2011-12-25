fs = require 'fs'
path = require 'path'
mkdirp = require 'mkdirp'
filewriter = require './filewriter'
helpers = require './helpers'
testrunner = require './testrunner'

exports.VERSION = require('./package').version

# Recompiles all files in current working directory.
# 
# config    - Parsed app config.
# once      - Should watcher be stopped after compiling the app first time?
# callback  - Callback that would be executed on each compilation.
#  
watchFile = (config, once, callback) ->
  console.log 'WF'
  changedFiles = {}
  languages = []
  for destinationPath, settings of config.files
    for regExp, language of settings.languages
      languages.push [///#{regExp}///, destinationPath, new language config]

  # TODO: test if cwd has config.
  watcher = new helpers.Watcher
  writer = new filewriter.FileWriter config
  watcher
    .add('app')
    .add('vendor')
    .on 'change', (file) ->
      clearTimeout changedFiles[file] if changedFiles[file]?
      changedFiles[file] = setTimeout ->
        console.log "File #{file} was changed"
        console.log "Langs", languages
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
           helpers.log '[Brunch]: installing npm packages...'
           (require 'child_process').exec "npm install #{rootPath}", (error, stderr, stdout) ->
             if error?
               helpers.logError "[Brunch]: error: #{stderr}"
               return callback()
             helpers.log '[Brunch]: installed package brunch-extensions'
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
