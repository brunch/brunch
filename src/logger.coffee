color = require 'ansi-color'
growl = require 'growl'
require 'date-utils'

colors =
  error: 'red'
  warn: 'yellow'
  info: 'green'
  debug: 'blue'

getInfo = (level) ->
  date = new Date().toFormat('DD MMM HH24:MI:SS')
  lvl = color.set level, colors[level]
  "#{date} - #{lvl}:"

logger =
  isDebug: process.env.BRUNCH_DEBUG is '1'
  isBench: process.env.BRUNCH_BENCH is '1'

  log: (level, args...) ->
    info = getInfo level
    process.nextTick ->
      if level is 'error' or level is 'warn'
        console.error info, args...
      else
        console.log info, args...

  error: ->
    growl [arguments...].join(' '), title: 'Brunch error'
    logger.log 'error', arguments...

  warn: ->
    logger.log 'warn', arguments...

  info: ->
    logger.log 'info', arguments...

  debug: ->
    if logger.isDebug
      logger.log 'debug', arguments...

  bench: ->
    if logger.isBench
      logger.log 'info', arguments...

module.exports = Object.freeze(logger)
