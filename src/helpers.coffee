coffeescript = require 'coffee-script'
express = require 'express'
growl = require 'growl'
sysPath = require 'path'

require.extensions['.coffee'] ?= (module, filename) ->
  content = coffeescript.compile fs.readFileSync filename, 'utf8', {filename}
  module._compile content, filename

# Extends the object with properties from another object.
# Example
#   
#   extend {a: 5, b: 10}, {b: 15, c: 20, e: 50}
#   # => {a: 5, b: 15, c: 20, e: 50}
# 
exports.extend = extend = (object, properties) ->
  object[key] = val for own key, val of properties
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
  "\x1b[#{getColor(color)}m#{text}\x1b[#{getColor('reset')}m"

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

exports.isTesting = ->
  no

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

# Sorts by pattern.
# 
# Examples
#
#   sort ['b.coffee', 'c.coffee', 'a.coffee'],
#     before: ['a.coffee'], after: ['b.coffee']
#   # => ['a.coffee', 'c.coffee', 'b.coffee']
# 
exports.sort = (files, config) ->
  return files if typeof config isnt 'object'
  config.before ?= []
  config.after ?= []
  # Clone data to a new array.
  [files...]
    .sort (a, b) ->
      # Try to find items in config.before.
      # Item that config.after contains would have bigger sorting index.
      indexOfA = config.before.indexOf a
      indexOfB = config.before.indexOf b
      [hasA, hasB] = [(indexOfA isnt -1), (indexOfB isnt -1)]
      if hasA and not hasB
        -1
      else if not hasA and hasB
        1
      else if hasA and hasB
        indexOfA - indexOfB
      else
        # Items wasn't found in config.before, try to find then in
        # config.after.
        # Item that config.after contains would have lower sorting index.
        indexOfA = config.after.indexOf a
        indexOfB = config.after.indexOf b
        [hasA, hasB] = [(indexOfA isnt -1), (indexOfB isnt -1)]
        if hasA and not hasB
          1
        else if not hasA and hasB
          -1
        else if hasA and hasB
          indexOfA - indexOfB
        else
          # If item path starts with 'vendor', it has bigger priority.
          aIsVendor = (a.indexOf 'vendor') is 0
          bIsVendor = (b.indexOf 'vendor') is 0
          if aIsVendor and not bIsVendor
            -1
          else if not aIsVendor and bIsVendor
            1
          else
            # All conditions were false, we don't care about order of
            # these two items.
            0

exports.startServer = (port = 3333, path = '.') ->
  try
    server = require sysPath.resolve 'server.coffee'
    server.startServer port, path, express, this
  catch error
    exports.logError "[Brunch]: couldn\'t load server.coffee. #{error}"
    exports.exit()

exports.loadConfig = (configPath) ->
  try
    {config} = require sysPath.resolve configPath
  catch error
    exports.logError "[Brunch]: couldn\'t load config.coffee. #{error}"
    exports.exit()
  config
