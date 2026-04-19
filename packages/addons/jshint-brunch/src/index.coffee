jshint = require('jshint').JSHINT
jshintcli = require('jshint/src/cli')
fs = require('fs')
path = require('path')
chalk = require('chalk')
pluralize = require('pluralize')

pad = (str, length) ->
  while str.length < length
    str = ' ' + str
  str

removeComments = (str) ->
  str = str or ""
  str = str.replace /\/\*(?:(?!\*\/)[\s\S])*\*\//g, ""
  str = str.replace /\/\/[^\n\r]*/g, "" # Everything after '//'

module.exports = class JSHintLinter
  brunchPlugin: yes
  type: 'javascript'
  extension: 'js'

  constructor: (@config) ->
    if 'jshint' of @config
      console.warn "Warning: config.jshint is deprecated, please move it to config.plugins.jshint"

    cfg = @config?.plugins?.jshint ? @config?.jshint ? {}
    @options = if cfg.options? then cfg.options
    @globals = cfg.globals
    @pattern = new RegExp(cfg.pattern ? ///^app.*\.js$///)
    @warnOnly = cfg.warnOnly
    @reporter = if cfg.reporter? then require(require(cfg.reporter))
    @reporterOptions = cfg.reporterOptions

    unless @options
      filename = path.join process.cwd(), ".jshintrc"
      # read settings from .jshintrc file if exists
      try
        stats = fs.statSync(filename)

        if stats.isFile()
          buff = fs.readFileSync filename
          @options = JSON.parse removeComments buff.toString()
          {@globals} = @options
          delete @options.globals
      catch e
        e = e.toString().replace "Error: ENOENT, ", ""
        console.warn ".jshintrc parsing error: #{e}. jshint will run with default options."

  lint: (data, path, callback) ->
    # return success whenever path doesn't match the given pattern or jshint returns sucess
    pathMatchesPattern = @pattern.test path
    if !pathMatchesPattern or jshint data, @options, @globals
      callback()
      return

    errors = jshint.errors.filter (error) -> error?

    if @reporter
      results = errors.map (error) ->
        error: error
        file: path

      # some reporters accept an options object as a third parameter
      # examples: jshint-stylish, jshint-summary
      @reporter.reporter results, undefined, @reporterOptions

      msg = "#{chalk.gray 'via JSHint'}"
    else
      errorMsg = for error in errors
        do (error) =>
          if Math.max(error.evidence?.length, error.character + error.reason.length) <= 120
            """
            #{pad error.line.toString(), 7} | #{chalk.gray error.evidence}
            #{pad "^", 10 + error.character} #{chalk.bold error.reason}
            """
          else
            """
            #{pad error.line.toString(), 7} | col: #{error.character} | #{chalk.bold error.reason}
            """

      errorMsg.unshift "JSHint detected #{errors.length} #{pluralize 'problem', errors.length}:"
      errorMsg.push '\n'

      msg = errorMsg.join '\n'

    msg = "warn: #{msg}" if @warnOnly
    callback msg
