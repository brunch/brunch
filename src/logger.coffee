'use strict'

color = require 'ansi-color'
growl = require 'growl'
require 'date-utils'

# Colors that will be used for various log levels.
colors =
  error: 'red'
  warn: 'yellow'
  info: 'green'

# Creates new log entry.
# Example:
#
#     getInfo 'warn'
#     # => 21 Feb 11:24:47 - warn:
#
getInfo = (level) ->
  date = new Date().toFormat('DD MMM HH24:MI:SS')
  lvl = color.set level, colors[level]
  "#{date} - #{lvl}:"

# Main logger object.
logger =
  errorHappened: no  # May be used for setting correct process exit code.
  notifications: on  # Enables / disables logging.

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

# Prevent logger from modifications.
module.exports = Object.seal logger
