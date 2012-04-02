{EventEmitter} = require 'events'
fs = require 'fs'
sysPath = require 'path'
common = require './common'
logger = require '../logger'

# Watches files & directories for changes.
# Uses old node.js API (fs.watchFile) because fs.watch doesn't
# work correctly on all platforms.
#
# Emitted events: `change`, `remove`.
# 
# Examples
# 
#   watcher = (new FileWatcher)
#     .add(directories)
#     .on('change', (path) -> console.log 'File', path, 'was added / changed')
#     .on('remove', (path) -> console.log 'File', path, 'was removed')
# 
module.exports = class FileWatcher extends EventEmitter
  # Files that wouldn't be watched.
  invalid: common.invalid

  constructor: ->
    @watched = {}

  _getWatchedDir: (directory) ->
    @watched[directory] ?= []

  # Private: Watch file for changes with fs.watchFile.
  # 
  # item     - string, path to file or directory.
  # callback - function that will be executed on fs change.
  # 
  # Returns nothing.
  _watch: (item, callback) ->
    parent = @_getWatchedDir sysPath.dirname item
    basename = sysPath.basename item
    # Prevent memory leaks.
    return if basename in parent
    parent.push basename
    fs.watchFile item, persistent: yes, interval: 100, (curr, prev) =>
      if curr.mtime.getTime() isnt prev.mtime.getTime()
        callback? item

  # Private: Emit `change` event once and watch file to emit it in the future
  # once the file is changed.
  # 
  # file - string, fs path.
  # 
  # Returns nothing.
  _handleFile: (file) ->
    emit = (file) =>
      @emit 'change', file
    emit file
    @_watch file, emit

  # Private: Read directory to add / remove files from `@watched` list
  # and re-read it on change.
  # 
  # directory - string, fs path.
  # 
  # Returns nothing.
  _handleDir: (directory) ->
    read = (directory) =>
      fs.readdir directory, (error, current) =>
        return logger.error error if error?
        return unless current
        previous = @_getWatchedDir directory

        # Files that absent in current directory snapshot
        # but present in previous emit `remove` event.
        previous
          .filter (file) =>
            file not in current
          .forEach (file) =>
            @emit 'remove', sysPath.join directory, file

        # Files that present in current directory snapshot
        # but absent in previous are added to watch list and
        # emit `change` event.
        current
          .filter (file) ->
            file not in previous
          .forEach (file) =>
            @_handle sysPath.join directory, file
    read directory
    @_watch directory, read

  # Private: Handle added file or directory.
  # Delegates call to _handleFile / _handleDir after checks.
  # 
  # item - string, path to file or directory.
  # 
  # Returns nothing.
  _handle: (item) =>
    # Don't handle invalid files, dotfiles etc.
    return if @invalid.test sysPath.basename item
    # Get the canonicalized absolute pathname.
    fs.realpath item, (error, path) =>
      return logger.error error if error?
      # Get file info, check is it file, directory or something else.
      fs.stat item, (error, stats) =>
        return logger.error error if error?
        @_handleFile item if stats.isFile()
        @_handleDir item if stats.isDirectory()

  # Public: Adds directories / files for tracking.
  # 
  # * files - array of strings (file pathes).
  # 
  # Examples
  # 
  #   add ['app', 'vendor']
  # 
  # Returns an instance of FileWatcher for chaning.
  add: (files) ->
    files.forEach @_handle
    this

  # Public: Call EventEmitter's event listening function.
  # Returns an instance of FileWatcher for chaning.
  on: ->
    super
    this

  # Public: Remove all listeners from watched files.
  # Returns an instance of FileWatcher for chaning.
  close: ->
    Object.keys(@watched).forEach (directory) =>
      @watched[directory].forEach (file) =>
        fs.unwatchFile sysPath.join directory, file
    @watched = {}
    this
