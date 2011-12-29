express = require 'express'
growl = require 'growl'

# Extends the object with properties from another object.
# Example
#   
#   extend {a: 5, b: 10}, {b: 15, c: 20, e: 50}
#   # => {a: 5, b: 15, c: 20, e: 50}
# 
exports.extend = extend = (object, properties) ->
  object[key] = val for own key, val of properties;
  object

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
  timeArr = (pad date["get#{item}"]() for item in ['Hours', 'Minutes', 'Seconds'])
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

exports.log = (text, color = 'green', isError = no) ->
  stream = if isError then process.stderr else process.stdout
  # TODO: log stdout on testing output end.
  output = "#{formatDate(color)} #{text}\n"
  stream.write output, 'utf8' unless exports.isTesting()
  growl text, title: 'Brunch error' if isError

exports.logError = (text) ->
  exports.log text, 'red', yes

exports.logDebug = (args...) ->
  console.log (formatDate 'green'), args...

exports.exit = ->
  if exports.isTesting()
    exports.logError 'Terminated process'
  else
    process.exit 0

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
  [pathes...]
    .sort (a, b) ->
      compareArrayItems config.before, a, b
    .sort (a, b) ->
      -(compareArrayItems config.after, a, b)
    .sort (a, b) ->
      aIsVendor = (a.indexOf 'vendor') is 0
      bIsVendor = (b.indexOf 'vendor') is 0
      if aIsVendor and not bIsVendor
        -1
      else if not aIsVendor and bIsVendor
        1
      else if aIsVendor and bIsVendor
        0
    .map (file) ->
      files[pathes.indexOf file]

exports.startServer = (port, rootPath = '.') ->
  server = express.createServer()
  server.configure ->
    server.use express.static rootPath
    server.set 'views', rootPath
    server.set 'view options', layout: no
  server.get '/', (req, res) -> res.render 'index.html'
  server.listen parseInt port, 10
  exports.log "[Brunch]: application starting on http://0.0.0.0:#{port}."
