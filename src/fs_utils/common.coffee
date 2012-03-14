fs = require 'fs'
mkdirp = require 'mkdirp'
sysPath = require 'path'

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
exports.writeFile = (path, data, callback) ->
  write = (callback) -> fs.writeFile path, data, callback
  write (error) ->
    return callback null, path, data unless error?
    mkdirp (sysPath.dirname path), (parseInt 755, 8), (error) ->
      return callback error if error?
      write (error) ->
        callback error, path, data
