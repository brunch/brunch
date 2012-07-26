'use strict'

{exec, spawn} = require 'child_process'
os = require 'os'
color = require 'ansi-color'
growl = require 'growl'
require 'date-utils'


notify = do ->
  isMountainLion = os.platform() is 'darwin' and os.release().indexOf('12.') is 0
  tnBin = '/Applications/terminal-notifier.app/Contents/MacOS/terminal-notifier'
  counter = 52910
  enabled = no

  if isMountainLion
    exec "#{tnBin} --help", (error, stdout, stderr) ->
      enabled = yes unless stderr.length > 0

  (message, args = {}, callback = ->) ->
    if isMountainLion and enabled
      throw new Error 'First argument is required in notification' unless message
      args.title ?= args.name ? 'Terminal'
      args.groupId ?= counter += 1
      args.bundleId ?= 'com.apple.Terminal'
      console.log [args.groupId, args.title, message, args.bundleId]
      proc = spawn tnBin, [args.groupId, args.title, message, args.bundleId]
      proc.on 'exit', ->
        callback()
      yes
    else
      growl message, args

colors =
  error: 'red'
  warn: 'yellow'
  info: 'green'
  debug: 'blue'

getInfo = (level) ->
  date = new Date().toFormat('DD MMM HH24:MI:SS')
  lvl = color.set level, colors[level]
  "#{date} - #{lvl}:"

namespace = process.env.BRUNCH_DEBUG

logger =
  isDebug: Boolean namespace
  errorHappened: no
  notifications: on

  debugNamespace: do ->
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
    notify args.join(' '), title: 'Brunch error' if logger.notifications
    logger.errorHappened = yes
    logger.log 'error', args...

  warn: (args...) ->
    logger.log 'warn', args...

  info: (args...) ->
    logger.log 'info', args...

  debug: (namespace, args...) ->
    if logger.isDebug and logger.matchesDebugNamespace namespace
      logger.log 'debug', args...

module.exports = Object.seal logger
