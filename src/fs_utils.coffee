async = require 'async'
{EventEmitter} = require 'events'
fs = require 'fs'
mkdirp = require 'mkdirp'
sysPath = require 'path'
util = require 'util'
helpers = require './helpers'

# A list of plugins your app would use. You could use:
# * npm package name, optionally with version number / range ('stylus-brunch@0.1.0')
# * git repo with package ('git://github.com/brunch/stylus-brunch.git')
# * tarball with package ('https://github.com/brunch/stylus-brunch/tarball/0.2')
# * path to directory with package ('../stylus-brunch')


# A simple file changes watcher.
# 
# files - array of directories that would be watched.
# 
# Example
# 
#   (new FSWatcher ['app', 'vendor'])
#     .on 'change', (file) ->
#       console.log 'File %s was changed', file
# 
class exports.FSWatcher extends EventEmitter
  # RegExp that would filter invalid files (dotfiles, emacs caches etc).
  invalid: /^(\.|#)/

  constructor: (files) ->
    @watched = {}
    @_handle file for file in files

  _getWatchedDir: (directory) ->
    @watched[directory] ?= []

  _watch: (item, callback) ->
    parent = @_getWatchedDir sysPath.dirname item
    basename = sysPath.basename item
    # Prevent memory leaks.
    return if basename in parent
    parent.push basename
    fs.watchFile item, persistent: yes, interval: 100, (curr, prev) =>
      if curr.mtime.getTime() isnt prev.mtime.getTime()
        callback? item

  _handleFile: (file) ->
    emit = (file) =>
      @emit 'change', file
    emit file
    @_watch file, emit

  _handleDir: (directory) ->
    read = (directory) =>
      fs.readdir directory, (error, current) =>
        return helpers.logError error if error?
        return unless current
        previous = @_getWatchedDir directory
        previous
          .filter (file) ->
            file not in current
          .forEach (file) =>
            @emit 'remove', sysPath.join directory, file

        current
          .filter (file) ->
            file not in previous
          .forEach (file) =>
            @_handle sysPath.join directory, file
    read directory
    @_watch directory, read

  _handle: (file) ->
    return if @invalid.test sysPath.basename file
    fs.realpath file, (error, path) =>
      return helpers.logError error if error?
      fs.stat file, (error, stats) =>
        return helpers.logError error if error?
        @_handleFile file if stats.isFile()
        @_handleDir file if stats.isDirectory()

  on: ->
    super
    this

  # Removes all listeners from watched files.
  close: ->
    for directory, files of @watched
      for file in files
        fs.unwatchFile sysPath.join directory, file
    @watched = {}
    this

# The definition would be added on top of every filewriter .js file.
requireDefinition = '''
(function(/*! Brunch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var module = cache[name], path = expand(root, name), fn;
      if (module) {
        return module;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: name, exports: {}};
        try {
          cache[name] = module.exports;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return cache[name] = module.exports;
        } catch (err) {
          delete cache[name];
          throw err;
        }
      } else {
        throw 'module \\'' + name + '\\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\\.\\.?(\\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    }
    this.require.define = function(bundle) {
      for (var key in bundle)
        modules[key] = bundle[key];
    };
  }
}).call(this);
'''

# Defines a requirejs module.
# This allows brunch users to use `require 'module/name'` in browsers.
# 
# path - path to file, contents of which will be wrapped.
# source - file contents.
# 
# Returns a wrapped string.
exports.wrap = wrap = (path, source) ->
  moduleName = JSON.stringify(
    path.replace(/^app\//, '').replace(/\.\w*$/, '')
  )
  """
  (this.require.define({
    #{moduleName}: function(exports, require, module) {
      #{source}
    }
  }));\n
  """

# Collects content from a list of files and wraps it with
# require.js module definition if needed.
# 
# files - array of objects with fields {file, data}.
# wrapResult - wrap result with a definition of require.js or not.
# 
# Example
# 
#   getFilesData [{'app/views/user.coffee', 'filedata'}], yes
# 
# Returns a string.
getFilesData = (files, wrapResult = no) ->
  data = ''
  data += requireDefinition if wrapResult
  data += files
    .map (file) ->
      if wrapResult and not (/^vendor/.test file.path)
        wrap file.path, file.data
      else
        file.data
    .join ''
  data

# Creates file if it doesn't exist and writes data to it.
# Would also create a parent directories if they don't exist.
#
# path - path to file that would be written.
# data - data to be written
# callback(error, path, data) - would be executed on error or on
#    successful write.
# 
# Example
# 
#   writeFile 'test.txt', 'data', (error) -> console.log error if error?
# 
writeFile = (path, data, callback) ->
  write = (callback) ->
    fs.writeFile path, data, callback
  write (error) ->
    return callback null, path, data unless error?
    mkdirp (sysPath.dirname path), (parseInt 755, 8), (error) ->
      return callback error if error?
      write (error) ->
        callback error, path, data

# The class could be used to 
# FileWriter would respond to
#   
#   .emit 'change', {destinationPath, path, data}
# 
# and launch 100ms write timer. If any other 'change' would occur in that
# period, the timer will be reset. Class events:
# - 'error' (error): would be emitten when error happened.
# - 'write' (results): would be emitted when all files has been written.
# 
# buildPath - an output directory.
# files - config entry, that describes file order etc.
# plugins - a list of functions with signature (files, callback).
#   Every plugin would be applied to the list of files.
# 
# Example
# 
#   writer = (new FileWriter buildPath, files, plugins)
#     .on 'error', (error) ->
#       console.log 'File write error', error
#     .on 'write', (result) ->
#       console.log 'Files has been written with data', result
#   writer.emit 'change',
#     destinationPath: 'result.js', path: 'app/client.coffee', data: 'fileData'
# 
class exports.FileWriter extends EventEmitter
  timeout: 50

  constructor: (@buildPath, @files = {}, @plugins = []) ->
    @destFiles = []
    @on 'change', @_onChange
    @on 'remove', @_onRemove

  _startTimer: ->
    clearTimeout @timeoutId if @timeoutId?
    @timeoutId = setTimeout @_write, @timeout

  _getDestFile: (destinationPath) ->
    destFile = @destFiles.filter((file) -> file.path is destinationPath)[0]
    unless destFile
      destFile = {path: destinationPath, sourceFiles: []}
      @destFiles.push destFile
    destFile

  _onChange: (changedFile) =>
    destFile = @_getDestFile changedFile.destinationPath
    sourceFile = destFile.sourceFiles.filter(
      (file) -> file.path is changedFile.path
    )[0]

    unless sourceFile
      sourceFile = changedFile
      destFile.sourceFiles.push sourceFile
      delete sourceFile.destinationPath
    sourceFile.data = changedFile.data
    @_startTimer()

  _onRemove: (removedFile) =>
    @destFiles.forEach (destFile) ->
      destFile.sourceFiles = destFile.sourceFiles.filter (sourceFile) ->
        sourceFile.path isnt removedFile
    @_startTimer()

  _concatFiles: (destFile) =>
    files = destFile.sourceFiles
    pathes = files.map (file) -> file.path
    order = @files[destFile.path]?.order
    destFile.sourceFiles = (helpers.sort pathes, order).map (file) ->
      files[pathes.indexOf file]
    wrapResult = /\.js$/.test destFile.path
    {
      path: (sysPath.join @buildPath, destFile.path),
      data: (getFilesData destFile.sourceFiles, wrapResult),
    }

  _write: =>
    beforeWrite = @plugins.map (plugin) -> (files, callback) ->
      plugin.beforeWrite files, callback
    getFiles = (callback) =>
      callback null, @destFiles.map @_concatFiles
    write = (file, callback) ->
      writeFile file.path, file.data, callback

    async.waterfall [getFiles, beforeWrite...], (error, files) =>
      return helpers.logError "beforeWrite plugin error. #{error}" if error?
      async.forEach files, write, (error, results) =>
        return @emit 'error', error if error?
        @emit 'write', results
