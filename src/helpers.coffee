coffeescript = require 'coffee-script'
express = require 'express'
growl = require 'growl'
sysPath = require 'path'
logger = require './logger'

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

exports.exit = ->
  if exports.isTesting()
    logger.error 'Terminated process'
  else
    process.exit 0

startDefaultServer = (port, path, callback) ->
  server = express.createServer()
  server.configure ->
    server.use express.static path
    server.set 'views', path
    server.set 'view options', layout: no
    server.register '.html', compile: (str, options) -> (locals) -> str
  server.get '/', (req, res) ->
    res.render 'index.html'
  server.listen parseInt port, 10
  server.on 'listening', callback
  logger.info "application started on http://0.0.0.0:#{port}."

exports.startServer = (port, buildPath, config, callback = (->)) ->
  if config.server?.path
    try
      server = require sysPath.resolve config.server.path
      server.startServer port, buildPath, callback
    catch error
      logger.error "couldn\'t load server #{config.server.path}: #{error}"
  else
    startDefaultServer port, buildPath, callback

exports.loadConfig = (configPath) ->
  try
    {config} = require sysPath.resolve configPath
  catch error
    logger.error "couldn\'t load config.coffee. #{error}"
    exports.exit()
  config
