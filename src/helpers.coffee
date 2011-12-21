fs  = require 'fs'
path = require 'path'
fileUtil = require 'file'
util = require 'util'
{exec, spawn} = require 'child_process'
{EventEmitter} = require 'events'
async = require 'async'

# Extends the object with properties from another object.
# Example
#   
#   extend {a: 5, b: 10}, {b: 15, c: 20, e: 50}
#   # => {a: 5, b: 15, c: 20, e: 50}
# 
exports.extend = extend = (object, properties) ->
  object[key] = val for own key, val of properties;
  object

# Groups array of objects by object field.
# Example
# 
#   group [{destinationPath: 'a', data: 1, str: 'f1'},
#    {destinationPath: 'a', data: 2, str: 'f2'},
#    {destinationPath: 'b', data: 3, str: 'f3'}]
#   # => [
#     {path: 'a', sourceFiles: [{data: 1, str: 'f1'}, {data: 2, str: 'f2'}]},
#     {path: 'b', sourceFiles: [{data: 3, str: 'f3'}]}
#   ]
#
# Returns new array of objects.
exports.groupLanguageFiles = (items) ->
  map = {}
  result = []
  counter = 0
  for item in items
    value = item.destinationPath
    unless value of map
      map[value] = counter
      newItem = {}
      newItem.path = value
      newItem.sourceFiles = []
      result.push newItem
      counter += 1
    index = map[value]
    newItem = result[index]
    obj = {}
    for own fieldName, fieldValue of item when fieldName isnt 'destinationPath'
      obj[fieldName] = fieldValue
    newItem.sourceFiles.push obj
  result

# Function that sorts array.
# array - array to be sorted.
# a - item, that could be in array
# b - another item, that could be in array
# Examples
# 
#   compareArrayItems [555, 666], 555, 666
#   # => 0
#   compareArrayItems [555, 666], 666, 555
#   # => 1
#   compareArrayItems [555, 666], 666, 3592
#   # => -1
# Returns:
# * -1 if b not in array
# * 0 if index of a is bigger than index of b OR both items aren't in array
# * 1 if index of a is smaller than index of b OR a not in array
exports.compareArrayItems = compareArrayItems = (array, a, b) ->
  [indexOfA, indexOfB] = [(array.indexOf a), (array.indexOf b)]
  [hasA, hasB] = [indexOfA isnt -1, indexOfB isnt -1]
  if hasA and not hasB
    -1
  else if not hasA and hasB
    1
  else if hasA and hasB
    Number indexOfA > indexOfB
  else
    0

# Example
# 
#   data = ['1', '3', '5', '2', '4']
#   config =
#     before: ['1', '2']
#     after: ['4', '5']
#   sortByConfig data, config
#   # => ['1', '2', '3', '4', '5']
exports.sortByConfig = sortByConfig = (data, config) ->
  if typeof config isnt 'object'
    throw new TypeError 'Sorting config is not an object'
  config.before ?= []
  config.after ?= []
  # Clone data to a new array because we
  # don't want a side effect here.
  [data...]
    .sort (a, b) ->
      compareArrayItems config.before, a, b
    .sort (a, b) ->
      -(compareArrayItems config.after, a, b)

# Sorts by pattern.
# 
# Examples
# 
#   data = [{
#     path: 'vendor/jquery.js', sourceFiles: [
#       {path: 'b.coffee'},
#       {path: 'a.coffee'}
#     ]
#   }]
#   config =
#     order:
#       'vendor/jquery.js':
#         before: ['a.coffee']
#         after: ['b.coffee']
#   sortLanguageFiles data, config
#   # => [{path: 'vendor/scripts/jquery.js', sourceFiles: [
#     {path: 'a.coffee'}, {path: 'b.coffee'}]}]
exports.sortLanguageFiles = (data, config) ->
  data.map (item) ->
    pathes = (file.path for file in item.sourceFiles)
    sorted = sortByConfig pathes, config.order[item.path]
    item.sourceFiles = for file, index in sorted
      item.sourceFiles[pathes.indexOf file]
    item

onChange: (changedFile) ->
  for destFile in destFiles when destFile.path is changedFile.path
    for sourceFile in compileData.source when sourceFile.path is sourceFile.path
      sourceFile.data = changedFile.data
      return

getSourceData = (data) ->
  result = []
  for destinationFile in data
    for sourceFile in destinationFile.sourceFiles
      result.push sourceFile.data
  result

writeFiles = (items, config) ->
  destFiles = helpers.sortLanguageFiles (helpers.groupLanguageFiles items), config
  for destFile in destFiles
    data = (sourceFile.data for sourceFile in destFile.sourceFiles).join ''
    callbacks = (sourceFile.onWrite for sourceFile in destFile.sourceFiles)
    fs.writeFile destFile.path, data, (error) =>
      for callback in callbacks
        callback error

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

getColor = (color = 'none') ->
  colors[color.toString()]

colorize = (text, color) ->
  "\033[#{getColor(color)}m#{text}\033[#{getColor('reset')}m"

# Adds '0' if a positive number is lesser than 10.
pad = (number) ->
  num = "#{number}"
  if num.length < 2
    "0#{num}"
  else
    num

# Generates current date and colorizes it, if specified.
# Example
# 
#   formatDate()
#   # => '[06:56:47]:'
# 
formatDate = (color = 'none') ->
  date = new Date
  timeArr = (pad date['get' + item]() for item in ['Hours', 'Minutes', 'Seconds'])
  time = timeArr.join ':'
  colorize "[#{time}]:", color

# Example
# 
#   capitalize 'test'
#   # => 'Test'
#
exports.capitalize = capitalize = (string) ->
  string[0].toUpperCase() + string[1..]

# Example
# 
#   formatClassName 'twitter_users'
#   # => 'TwitterUsers'
#
exports.formatClassName = (filename) ->
  filename.split('_').map(capitalize).join('')

exports.isTesting = ->
  'jasmine' of global

exports.notify = (title, text) ->
  null

# Map of possible system notifiers in format
# Key - "name of system command that would be executed".
# Value - args, with which the command would be spawned.
# E.g. spawn growlnotify, [title, '-m', text]
exports.notifiers = notifiers =
  growlnotify: (title, text) -> [title, '-m', text]
  'notify-send': (title, text) -> [title, text]

# Try to determine right system notifier.
for name, transform of notifiers
  do (name, transform) ->
    exec "which #{name}", (error) ->
      exports.notify = ((args...) -> spawn name, transform args...) unless error?

exports.log = (text, color = 'green', isError = no) ->
  stream = if isError then process.stderr else process.stdout
  # TODO: log stdout on testing output end.
  output = "#{formatDate(color)} #{text}\n"
  stream.write output, 'utf8' unless exports.isTesting()
  exports.notify 'Brunch error', text if isError

exports.logError = (text) ->
  exports.log text, 'red', yes

exports.logDebug = (args...) ->
  console.log formatDate('green'), args...

exports.exit = ->
  if exports.isTesting()
    exports.logError 'Terminated process'
  else
    process.exit 0

# Copies single file and executes callback when done.
exports.copyFile = (source, destination, callback) ->
  read = fs.createReadStream source
  write = fs.createWriteStream destination
  util.pump read, write, -> callback?()

# Asynchronously walks through directory tree, creates directories and copies
# files. Similar to `cp -r` in Unix.
# 
# Example
# 
#   walkTreeAndCopyFiles 'assets', 'build'
# 
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

exports.createBuildDirectories = (buildPath) ->
  for dirPath in ['styles', 'scripts']
    fileUtil.mkdirsSync path.join(buildPath, dirPath), 0755

# Recursively copies directory tree from `source` to `destination`.
# Fires callback function with error and a list of created files.
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


# A simple file changes watcher.
# 
# Example
# 
#   (new Watcher)
#     .add('app')
#     .add('vendor')
#     .onChange (file) ->
#       console.log 'File %s was changed', file
# 
class exports.Watcher extends EventEmitter
  # RegExp that would filter invalid files (dotfiles, emacs caches etc).
  invalid: /^(\.|#)/

  constructor: ->
    @watched = {}

  _getWatchedDir: (directory) ->
    @watched[directory] ?= []

  _watch: (item, callback) ->
    parent = @_getWatchedDir path.dirname item
    basename = path.basename item
    # Prevent memory leaks.
    return if basename in parent
    #console.log 'Watching', item
    parent.push basename
    fs.watchFile item, persistent: yes, interval: 500, (curr, prev) =>
      callback? item unless curr.mtime.getTime() is prev.mtime.getTime()

  _handleFile: (file) ->
    emit = (file) =>
      @emit 'change', file
    emit file
    @_watch file, emit

  _handleDir: (directory) ->
    read = (directory) =>
      fs.readdir directory, (error, current) =>
        return exports.logError error if error?
        return unless current
        previous = @_getWatchedDir directory
        for file in previous when file not in current
          console.log 'Deleting file', (path.join directory, file)
          @emit 'delete', file
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

  # Fired when some file was added.
  add: (file) ->
    @_handle file
    this

  # Fired when some file was changed.
  onChange: (callback) ->
    @on 'change', callback
    this

  # Fired when some file was deleted.
  onDelete: (callback) ->
    @on 'delete', callback
    this

  # Removes all listeners from watched files.
  clear: ->
    @removeAllListeners 'change'
    for directory, files of @watched
      for file in files
        fs.unwatchFile path.join directory, file
    @watched = {}
    this


# Filter out dotfiles, emacs swap files and directories.
exports.filterFiles = (files, sourcePath) ->
  files.filter (filename) ->
    return no if (exports.Watcher::invalid).test filename
    stats = fs.statSync path.join sourcePath, filename
    return no if stats?.isDirectory()
    yes
