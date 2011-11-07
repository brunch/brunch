fs = require "fs"
path = require "path"
{exec, spawn} = require "child_process"
{EventEmitter} = require "events"
async = require "async"
fileUtil = require "file"
sys = require "sys"
_ = require "underscore"


exports.extend = extend = (object, properties) ->
  for key, val of properties
    object[key] = val
  object


# copy single file and executes callback when done
exports.copyFile = (source, destination, callback) ->
  read = fs.createReadStream source
  write = fs.createWriteStream destination
  sys.pump read, write, -> callback()


# walk through tree, creates directories and copy files
exports.walkTreeAndCopyFiles = walkTree = (source, destination, callback) ->
  fs.readdir source, (error, files) ->
    return callback error if error

    # iterates over current directory
    async.forEach files, (file, next) ->
      return next() if file.match /^\./

      sourcePath = path.join source, file
      destinationPath = path.join destination, file

      fs.stat sourcePath, (error, stats) ->
        if not error and stats.isDirectory()
          fs.mkdir destinationPath, 0755, ->
            walkTree sourcePath, destinationPath, (error, destinationPath) ->
              if destinationPath
                callback error, destinationPath
              else
                next()
        else
          exports.copyFile sourcePath, destinationPath, ->
            callback error, destinationPath
            next()
    , callback


# recursive copy file tree from source to destination and fires
# callback with error and a list of created files
exports.recursiveCopy = (source, destination, callback) ->
  fileUtil.mkdirsSync destination, 0755
  paths = []
  # callback will be called several times
  walkTree source, destination, (err, filename) ->
    if err
      callback err
    else if filename
      paths.push filename
    else
      callback err, paths.sort()


class exports.Watcher extends EventEmitter
  # RegExp that would filter invalid files (dotfiles, emacs caches etc).
  invalid: /^(\.|#)/

  constructor: ->
    #console.log "Created"
    @watched = {}

  _getWatchedDir: (directory) ->
    @watched[directory] ?= []

  _watch: (item, callback) ->
    parent = @_getWatchedDir path.dirname item
    basename = path.basename item
    # Prevent memory leaks.
    return if basename in parent
    #console.log "Watching", item
    parent.push basename
    fs.watchFile item, persistent: yes, interval: 500, (curr, prev) =>
      callback? item unless curr.mtime.getTime() is prev.mtime.getTime()

  _handleFile: (file) ->
    emit = (file) =>
      @emit "change", file
    emit file
    @_watch file, emit

  _handleDir: (directory) ->
    read = (directory) =>
      fs.readdir directory, (error, current) =>
        return exports.logError error if error?
        return unless current
        previous = @_getWatchedDir directory
        for file in previous when file not in current
          console.log "Deleting file", (path.join directory, file)
          @emit "delete", file
        for file in current when file not in previous
          @_handle (path.join directory, file)
    read directory
    @_watch directory, read

  _handle: (file) ->
    return if @invalid.test path.basename file
    fs.realpath file, (error, filePath) =>
      return exports.logError error if error?
      fs.stat file, (error, stats) =>
        return exports.logError error if error?
        @_handleFile file if stats.isFile()
        @_handleDir file if stats.isDirectory()

  add: (file) ->
    @_handle file
    @

  onChange: (callback) ->
    @on "change", callback
    @

  onDelete: (callback) ->
    @on "delete", callback
    @

  clear: ->
    @removeAllListeners "change"
    for directory, files of @watched
      for file in files
        fs.unwatchFile path.join directory, file
    @watched = {}
    @


# Filter out dotfiles, emacs swap files and directories.
exports.filterFiles = (files, sourcePath) ->
  files.filter (filename) ->
    return no if (exports.Watcher::invalid).test filename
    stats = fs.statSync path.join sourcePath, filename
    return no if stats?.isDirectory()
    yes


# Shell color manipulation tools.
colors =
  black: 30
  red: 31
  green: 32
  brown: 33
  blue: 34
  purple: 35
  cyan: 36
  gray: 37
  none: ''
  reset: 0


getColor = (color) ->
  colors[color.toString()] or colors.none


colorize = (text, color) ->
  "\033[#{getColor(color)}m#{text}\033[#{getColor('reset')}m"


pad = (number) ->
  num = "#{number}"
  if num.length < 2 then "0#{num}" else num


formatDate = (color = "none") ->
  date = new Date
  timeArr = (pad date["get" + item]() for item in ["Hours", "Minutes", "Seconds"])
  time = timeArr.join ":"
  colorize "[#{time}]:", color


exports.capitalize = capitalize = (string) ->
  string[0].toUpperCase() + string[1..]


exports.formatClassName = (filename) ->
  filename.split("_").map(capitalize).join("")


exports.isTesting = ->
  "jasmine" of global



exports.notify = (title, text) -> null


# Map of possible system notifiers in format
# Key - "name of system command that would be executed".
# Value - args, with which the command would be spawned.
# E.g. spawn growlnotify, [title, "-m", text]
exports.notifiers = notifiers =
  growlnotify: (title, text) -> [title, "-m", text]
  "notify-send": (title, text) -> [title, text]


# Try to determine right system notifier.
for name, transform of notifiers
  do (name, transform) ->
    exec "which #{name}", (error) ->
      exports.notify = ((args...) -> spawn name, transform args...) unless error?


exports.log = (text, color = "green", isError = no) ->
  stream = if isError then process.stderr else process.stdout
  # TODO: log stdout on testing output end.
  output = "#{formatDate(color)} #{text}\n"
  stream.write output, "utf8" unless exports.isTesting()
  exports.notify "Brunch error", text if isError


exports.logError = (text) -> exports.log text, "red", yes


exports.logDebug = (args...) -> console.log formatDate("green"), args...


exports.exit = ->
  if exports.isTesting()
    exports.logError "Terminated process"
  else
    process.exit 0
