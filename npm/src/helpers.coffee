fs        = require 'fs'
path      = require 'path'
exec      = require('child_process').exec
async     = require 'async'
fileUtil  = require 'file'
_         = require 'underscore'

# copy source to destination recursively
exports.copy = (source, target) ->
  exec 'cp -R ' + source + ' ' + target, (error, stdout, stderr) ->
    console.log(stdout) if stdout
    console.log(stderr) if stderr
    console.log(error) if error

# walk directory and return files
# copied from sstephenson's stich
walkTree = (directory, callback) ->
  fs.readdir directory, (err, files) =>
    return callback err if err

    async.forEach files, (file, next) =>
      return next() if file.match /^\./
      filename = path.join directory, file

      fs.stat filename, (err, stats) =>
        if !err and stats.isDirectory()
          walkTree filename, (err, filename) ->
            if filename
              callback err, filename
            else
              next()
        else
          callback err, filename
          next()
    , callback

# filter out every non-js file of an array of filenames
filterForJsFiles = (files) ->
  jsFiles = []
  for file in files
    jsFiles.push file if path.extname(file) == ".js"
  jsFiles

# collect all files from a directory and return an array if all collected
# originally copied from sstephenson's stich
exports.getFilesInTree = (directory, callback) ->
  files = []
  walkTree directory, (err, filename) ->
    if err
      callback err
    else if filename
      files.push filename
    else
      files = filterForJsFiles files
      callback err, files.sort()

# create directory path for the given file
exports.mkdirsForFile = (file, mode) ->
  newPath = file.replace(/\/[^\/]*$/, '')
  fileUtil.mkdirsSync newPath, mode

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
