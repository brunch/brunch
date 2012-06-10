'use strict'

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
  isDebug: Boolean process.env.BRUNCH_DEBUG
  debugNamespace: do ->
    namespace = process.env.BRUNCH_DEBUG
    if namespace
      if namespace is '*'
        '*'
      else
        namespace.split(',')
    else
      []

  matchesDebugNamespace: (current) ->
    namespace = logger.debugNamespace
    namespace is '*' or current in namespace

  log: (level, args...) ->
    info = getInfo level
    process.nextTick ->
      if level is 'error' or level is 'warn'
        console.error info, args...
      else
        console.log info, args...

  error: (args...) ->
    growl args.join(' '), title: 'Brunch error'
    logger.log 'error', args...

  warn: (args...) ->
    logger.log 'warn', args...

  info: (args...) ->
    logger.log 'info', args...

  debug: (namespace, args...) ->
    if logger.isDebug and logger.matchesDebugNamespace namespace
      logger.log 'debug', args...

module.exports = Object.freeze(logger)
