fs        = require 'fs'
path      = require 'path'
spawn     = require('child_process').spawn
async     = require 'async'
fileUtil  = require 'file'
_         = require 'underscore'
sys       = require 'sys'

# copy single file and executes callback when done
exports.copyFile = (source, destination, callback) ->
  read = fs.createReadStream source
  write = fs.createWriteStream destination
  sys.pump read, write, ->
    callback()

# walk through tree and creates directories and copy files
exports.walkTreeAndCopyFiles = (source, destination, callback) ->
  fs.readdir source, (err, files) ->
    return callback err if err

    # iterates over directory
    async.forEach files, (file, next) ->
      return next() if file.match /^\./

      sourcePath = path.join source, file
      destinationPath = path.join destination, file

      fs.stat sourcePath, (err, stats) ->
        if !err and stats.isDirectory()
          fs.mkdir destinationPath, 0755, ->
            exports.walkTreeAndCopyFiles sourcePath, destinationPath, (err, destinationPath) ->
              if destinationPath
                callback err, destinationPath
              else
                next()
        else
          exports.copyFile sourcePath, destinationPath, ->
            callback err, destinationPath
            next()
    , callback

# recursive copy file tree from source to destination and fires
# callback with error and a list of created files
exports.recursiveCopy = (source, destination, callback) ->
  fileUtil.mkdirsSync destination, 0755
  paths = []
  # callback will be called several times
  exports.walkTreeAndCopyFiles source, destination, (err, filename) ->
    if err
      callback err
    else if filename
      paths.push filename
    else
      callback err, paths.sort()


## copied source from watch_dir, because it did not work as package
exports.watchDirectory = (_opts, callback) ->
  opts = _.extend(
    { path: '.', persistent: true, interval: 500, callOnAdd: false },
    _opts
  )
  watched = []
  addToWatch = (file) ->
    fs.realpath file, (err, filePath) ->
      callOnAdd = opts.callOnAdd

      unless _.include(watched, filePath)
        isDir = false
        watched.push filePath
        fs.watchFile filePath, { persistent: opts.persistent, interval: opts.interval }, (curr, prev) ->
          return if curr.mtime.getTime() is prev.mtime.getTime()
          if isDir
            addToWatch filePath
          else
            callback filePath
      else
        callOnAdd = false

      fs.stat filePath, (err, stats) ->
        if stats.isDirectory()
          isDir = true
          fs.readdir filePath, (err, files) ->
            process.nextTick () ->
              addToWatch filePath + '/' + file for file in files
        else
          callback filePath if callOnAdd
  addToWatch opts.path

# return a string of available options
# originally taken from nomnom helpString
exports.optionsInfo = (options) ->
  output = "\n\nAvailable options:\n"
  for option in options
    if option.position == undefined
      output += "  #{option.string}\t#{option.help}\n"
  output

exports.log = (info, options) ->
  d = new Date()
  timestamp = exports.formatIsodate(d)
  process.stdout.write timestamp + " " + info

# iso date formatting taken from
# https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference:Global_Objects:Date#Example.3a_ISO_8601_formatted_dates
exports.formatIsodate = (d) ->
  pad = (n) ->
    if n<10
      '0'+n
    else
      n
  d.getUTCFullYear()+'-'+ pad(d.getUTCMonth()+1)+'-'+ pad(d.getUTCDate())+'T'+ pad(d.getUTCHours())+':'+ pad(d.getUTCMinutes())+':'+ pad(d.getUTCSeconds())+'Z'
