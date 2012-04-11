growl = require 'growl'
winston = require 'winston'

class ConsoleGrowlTransport extends winston.transports.Console
  constructor: ->
    super
    @super = ConsoleGrowlTransport.__super__

  log: (level, msg, meta, callback) ->
    args = arguments
    notify = (notifyCallback) ->
      if level is 'error'
        growl msg, title: 'Brunch error', notifyCallback
      else
        notifyCallback()
    notify =>
      @super.log.apply this, args

  debug: (msg) ->
    @log 'debug', msg

module.exports = logger = new winston.Logger transports: [
  new ConsoleGrowlTransport {
    colorize: 'true',
    timestamp: 'true'
  }
]

debug = process.env.BRUNCH_DEBUG is '1'
logger.setLevels winston.config.syslog.levels unless debug
