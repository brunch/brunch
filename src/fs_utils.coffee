async = require 'async'
{EventEmitter} = require 'events'
fs = require 'fs'
mkdirp = require 'mkdirp'
path = require 'path'
util = require 'util'
helpers = require './helpers'

# A simple file changes watcher.
# 
# Example
# 
#   (new FSWatcher)
#     .add 'app'
#     .on 'change', (file) ->
#       console.log 'File %s was changed', file
# 
class exports.FSWatcher extends EventEmitter
  # RegExp that would filter invalid files (dotfiles, emacs caches etc).
  invalid: /^(\.|#)/

  constructor: (files) ->
    @watched = {}
    if Array.isArray files
      #files.forEach @_handle
      @_handle file for file in files
    else
      @_handle files

  _getWatchedDir: (directory) ->
    @watched[directory] ?= []

  _watch: (item, callback) ->
    parent = @_getWatchedDir path.dirname item
    basename = path.basename item
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
        for file in previous when file not in current
          @emit 'remove', file
        for file in current when file not in previous
          @_handle path.join directory, file
    read directory
    @_watch directory, read

  _handle: (file) ->
    return if @invalid.test path.basename file
    fs.realpath file, (error, filePath) =>
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
        fs.unwatchFile path.join directory, file
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

exports.wrap = wrap = (filePath, data) ->
  moduleName = JSON.stringify(
    filePath.replace(/^app\//, '').replace(/\.\w*$/, '')
  )
  """
  (this.require.define({
    #{moduleName}: function(exports, require, module) {
      #{data}
    }
  }));\n
  """

# 
# config - parsed app config.
# 
# Example
# 
#   writer = (new FileWriter config)
#     .on 'error', (error) ->
#       console.log 'File write error', error
#     .on 'write', (result) ->
#       console.log 'Files has been written with data', result
#   writer.emit 'change',
#     destinationPath: 'result.js', path: 'app/client.coffee', data: 'fileData'
# 
class exports.FileWriter extends EventEmitter
  timeout: 50

  constructor: (@buildPath, @files, @plugins) ->
    @destFiles = []
    @on 'change', @_onChange
    @on 'remove', @_onRemove

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

    clearTimeout @timeoutId if @timeoutId?
    @timeoutId = setTimeout @_write, @timeout

  _onRemove: (removedFile) =>
    destFile = @_getDestFile removedFile.destinationPath
    destFile.sourceFiles = destFile.sourceFiles.filter (sourceFile) ->
      sourceFile.path isnt removedFile.path

  _getFilesData: (destFile) ->
    destIsJS = /\.js$/.test destFile.path
    data = ''
    data += requireDefinition if destIsJS
    data += destFile.sourceFiles
      .map (sourceFile) ->
        if destIsJS and not (/^vendor/.test sourceFile.path)
          wrap sourceFile.path, sourceFile.data
        else
          sourceFile.data
      .join ''
    data

  _concatFiles: (destFile) =>
    files = destFile.sourceFiles
    pathes = files.map (file) -> file.path
    order = @files[destFile.path].order
    destFile.sourceFiles = (helpers.sort pathes, order).map (file) ->
      files[pathes.indexOf file]
    data = @_getFilesData destFile
    {path: (path.join @buildPath, destFile.path), data}

  _writeFile: (file, callback) =>
    writeFile = (callback) =>
      fs.writeFile file.path, file.data, callback
    writeFile (error) ->
      if error?
        mkdirp (path.dirname file.path), 0755, (error) ->
          callback error if error?
          writeFile (error) ->
            callback error, file
      else
        callback null, file

  _write: =>
    plugins = @plugins.map (plugin) -> (files, callback) ->
      plugin.load files, callback
    files = @destFiles.map @_concatFiles
    noop = (callback) -> callback null, files
    async.waterfall [noop, plugins...], (error, files) =>
      return helpers.logError "[Brunch]: plugin error. #{error}" if error?
      async.forEach files, @_writeFile, (error, results) =>
        return @emit 'error' if error?
        @emit 'write', results
