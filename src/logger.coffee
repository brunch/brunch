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

  log: (level, args...) ->
    info = getInfo level
    process.nextTick ->
      if level is 'error' or level is 'warn'
        console.error info, args...
      else
        console.log info, args...

  error: ->
    growl [arguments...].join(' '), title: 'Brunch error'
    @log 'error', arguments...

  warn: ->
    @log 'warn', arguments...

  info: ->
    @log 'info', arguments...

  debug: ->
    if @isDebug
      @log 'debug', arguments...

module.exports = Object.freeze(logger)
