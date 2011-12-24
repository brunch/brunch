fs = require 'fs'
path = require 'path'
async = require 'async'
{EventEmitter} = require 'events'

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

# Sorts by pattern.
# 
# Examples
#         
#   sort [{path: 'b.coffee'}, {path: 'c.coffee'}, {path: 'a.coffee'}],
#     before: ['a.coffee'], after: ['b.coffee']
#   # => [{path: 'a.coffee'}, {path: 'c.coffee'}, {path: 'b.coffee'}]
# 
exports.sort = (files, config) ->
  return files if typeof config isnt 'object'
  config.before ?= []
  config.after ?= []
  pathes = files.map (file) -> file.path
  # Clone data to a new array because we
  # don't want a side effect here.
  sorted = [pathes...]
    .sort (a, b) ->
      compareArrayItems config.before, a, b
    .sort (a, b) ->
      -(compareArrayItems config.after, a, b)
  sorted.map (file) -> files[pathes.indexOf file]

exports.readConfig = (file) ->
  require path.resolve file

class exports.FileWriter extends EventEmitter
  constructor: (@config) ->
    @destFiles = []
    @on 'change', @_onChange
    @on 'remove', @_onRemove

  _getDestFile: (destinationPath) ->
    destFile = @destFiles.filter(({path}) -> path is destinationPath)[0]
    unless destFile
      destFile = path: destinationPath, sourceFiles: []
      @destFiles.push destFile
    destFile

  _onChange: (changedFile) =>
    destFile = @_getDestFile changedFile.destinationPath
    sourceFile = destFile.sourceFiles.filter(({path}) -> path is changedFile.path)[0]
    
    unless sourceFile
      sourceFile = changedFile
      concatenated = destFile.sourceFiles.concat [sourceFile]
      destFile.sourceFiles = exports.sort concatenated, @config.files[changedFile.destinationPath].order
      delete changedFile.destinationPath
    sourceFile.data = changedFile.data

    clearTimeout @timeout if @timeout?
    @timeout = setTimeout @write, 20

  _onRemove: (removedFile) =>
    console.log 'FileWriter: remove'
    destFile = @_getDestFile removedFile.destinationPath
    destFile.sourceFiles = destFile.sourceFiles.filter (sourceFile) ->
      sourceFile.path isnt removedFile.path

  write: =>
    console.log 'Writing files', JSON.stringify @destFiles, null, 2
    async.forEach @destFiles, (destFile, next) =>
      data = (sourceFile.data for sourceFile in destFile.sourceFiles).join ''
      # TODO.
      destPath = path.join 'build', destFile.path
      fs.writeFile destPath, data, (error) =>
        next error, {path: destPath, data}
    , (error, results) =>
      @emit 'write', results
