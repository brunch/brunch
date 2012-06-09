color = require 'ansi-color'
growl = require 'growl'
require 'date-utils'

colors =
  error: 'red'
  warn: 'yellow'
  info: 'green'
  debug: 'blue'

get-info = (level) ->
  date = new Date().to-format('DD MMM HH24:MI:SS')
  lvl = color.set level, colors[level]
  "#{date} - #{lvl}:"

logger =
  is-debug: process.env.BRUNCH_DEBUG is '1'

  log: (level, ...args) ->
    info = get-info level
    process.next-tick ->
      if level is 'error' or level is 'warn'
        console.error info, ...args
      else
        console.log info, ...args

  error: ->
    growl [...arguments].join(' '), title: 'Brunch error'
    logger.log 'error', ...arguments

  warn: ->
    logger.log 'warn', ...arguments

  info: ->
    logger.log 'info', ...arguments

  debug: ->
    if logger.is-debug
      logger.log 'debug', ...arguments

module.exports = Object.freeze(logger)
