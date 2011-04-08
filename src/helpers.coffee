fs        = require 'fs'
path      = require 'path'
spawn     = require('child_process').spawn
async     = require 'async'
fileUtil  = require 'file'
_         = require 'underscore'

# copy source to destination recursively
# TODO find or create a recursive copy function to get rid of the callback hell in brunch.new
exports.copy = (source, target, callback) ->
  cp = spawn 'cp', ['-R', source, target]

  cp.stderr.on 'data', (data) ->
    console.log data

  cp.on 'exit', (code) ->
    callback() if typeof(callback) is 'function'

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
