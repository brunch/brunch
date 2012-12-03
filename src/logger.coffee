'use strict'

color = require 'ansi-color'
growl = require 'growl'
require 'date-utils'

colors =
  error: 'red'
  warn: 'yellow'
  info: 'green'

getInfo = (level) ->
  date = new Date().toFormat('DD MMM HH24:MI:SS')
  lvl = color.set level, colors[level]
  "#{date} - #{lvl}:"

logger =
  errorHappened: no
  notifications: on

  log: (level, args...) ->
    info = getInfo level
    process.nextTick ->
      if level is 'error' or level is 'warn'
        console.error info, args...
      else
        console.log info, args...

  error: (args...) ->
    growl args.join(' '), title: 'Brunch error' if logger.notifications
    logger.errorHappened = yes
    logger.log 'error', args...

  warn: (args...) ->
    logger.log 'warn', args...

  info: (args...) ->
    logger.log 'info', args...

module.exports = Object.seal logger
