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
  constructor: ->
    @watched = []

  _justAdded: ->
    setTimeout (=> @emit "change")

  _handleFile: (file, add) ->
    if add
      unless file in @watched
        @emit "change", file
        @watched.push file
      fs.watchFile file, {persistent: yes, interval: 500}, (curr, prev) =>
        unless curr.mtime.getTime() is prev.mtime.getTime()
          @emit "change", file
    else
      fs.unwatchFile file

  _handleDir: (dir, add) ->
    fs.readdir dir, (error, files) =>
      for file in files
        @_handle (path.join dir, file), add

  _handle: (file, add) ->
    fs.realpath file, (error, filePath) =>
      return exports.logError error if error?
      fs.stat file, (error, stats) =>
        return exports.logError error if error?
        @_handleFile file, add if stats.isFile()
        @_handleDir file, add if stats.isDirectory()

  add: (file) ->
    @_handle file, yes
    @

  remove: (file) ->
    @_handle file, no
    @

  onChange: (callback) ->
    @on "change", callback
    @
  
  clear: ->
    @removeAllListeners "change"
    @watched = []
    @


# Filter out dotfiles, emacs swap files and directories.
exports.filterFiles = (files, sourcePath) ->
  files.filter (filename) ->
    return no if filename.match /^(\.|#)/
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


exports.isTesting = ->
  "jasmine" of global


hasGrowl = no
exec "which growlnotify", (error) ->
  hasGrowl = yes unless error?

hasNotifySend = no
exec "which notify-send", (error) ->
  hasNotifySend = yes unless error?


exports.growl = (title, text) ->
  if hasGrowl then spawn "growlnotify", [title, "-m", text]
  else if hasNotifySend then spawn "notify-send", [title, text]


exports.log = (text, color = "green", isError = no) ->
  stream = if isError then process.stderr else process.stdout
  # TODO: log stdout on testing output end.
  output = "#{formatDate(color)} #{text}\n"
  stream.write output, "utf8" unless exports.isTesting()
  exports.growl "Brunch error", text if isError


exports.logError = (text) -> exports.log text, "red", yes


exports.logDebug = (args...) -> console.log formatDate("green"), args...


exports.exit = ->
  if exports.isTesting()
    exports.logError "Terminated process"
  else
    process.exit 0
