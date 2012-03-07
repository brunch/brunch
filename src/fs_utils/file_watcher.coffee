{EventEmitter} = require 'events'
fs = require 'fs'
sysPath = require 'path'

class exports.FileWatcher extends EventEmitter
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
        return logger.error error if error?
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
      return logger.error error if error?
      fs.stat file, (error, stats) =>
        return logger.error error if error?
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
