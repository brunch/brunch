# Copied from https://github.com/mhevery/jasmine-node and translated to CoffeeScript

noop = ->
util = undefined
try
  util = require("util")
catch e
  util = require("sys")
printRunnerResults = (runner) ->
  results = runner.results()
  specs = runner.specs()
  msg = ""
  msg += specs.length + " test" + (if (specs.length is 1) then "" else "s") + ", "
  msg += results.totalCount + " assertion" + (if (results.totalCount is 1) then "" else "s") + ", "
  msg += results.failedCount + " failure" + (if (results.failedCount is 1) then "" else "s") + "\n"
  msg

ANSIColors =
  pass: ->
    "\u001b[32m"

  fail: ->
    "\u001b[31m"

  neutral: ->
    "\u001b[0m"

NoColors =
  pass: ->
    ""

  fail: ->
    ""

  neutral: ->
    ""

TerminalReporter = (config) ->
  @print_ = config.print or util.print
  @isVerbose_ = config.verbose or false
  @onComplete_ = config.onComplete or noop
  @color_ = (if config.color then ANSIColors else NoColors)
  @stackFilter = config.stackFilter or (t) ->
    t

  @columnCounter_ = 0
  @log_ = []
  @start_ = 0

TerminalReporter:: =
  log: noop
  reportSpecStarting: noop
  reportRunnerStarting: (runner) ->
    @printLine_ "Started"
    @start_ = Number(new Date)
    @spec_results = ""

  reportSuiteResults: (suite) ->
    specResults = suite.results()
    path = []
    while suite
      path.unshift suite.description
      suite = suite.parentSuite
    description = path.join(" ")
    @log_.push "Spec " + description  if @isVerbose_
    outerThis = this
    specResults.items_.forEach (spec) ->
      if spec.description and spec.failedCount > 0
        outerThis.log_.push description  unless outerThis.isVerbose_
        outerThis.log_.push "  it " + spec.description
        spec.items_.forEach (result) ->
          unless result.passed_
            errorMessage = result.trace.stack or result.message
            if outerThis.teamcity_
              outerThis.log_.push "##teamcity[testFailed name='" + escapeTeamcityString(spec.description) + "' message='[FAILED]' details='" + escapeTeamcityString(outerThis.stackFilter(outerThis.stackFilter(errorMessage))) + "']"
            else
              outerThis.log_.push (if result.message.indexOf("timeout:") is 0 then "  TIMEOUT:" + result.message.substr(8) else "  " + outerThis.stackFilter(errorMessage) + "\n")
      else
        outerThis.log_.push "  it " + spec.description  if outerThis.isVerbose_

    @log_.push "\u0000"  if @isVerbose_

  reportSpecResults: (spec) ->
    result = spec.results()
    msg = ""
    if result.passed()
      msg = @stringWithColor_(".", @color_.pass())
    else
      msg = @stringWithColor_("F", @color_.fail())
    @spec_results += msg
    @print_ msg
    return  if @columnCounter_++ < 50
    @columnCounter_ = 0
    @print_ "\n"

  reportRunnerResults: (runner) ->
    elapsed = (Number(new Date) - @start_) / 1000
    owner = this
    @printLine_ "\n"
    @log_.forEach (entry) ->
      owner.printLine_ entry

    @printLine_ @spec_results  if @isVerbose_
    @printLine_ "Finished in " + elapsed + " seconds"
    summary = printRunnerResults(runner)
    if runner.results().failedCount is 0
      @printLine_ @stringWithColor_(summary, @color_.pass())
    else
      @printLine_ @stringWithColor_(summary, @color_.fail())
    @onComplete_ runner, @log_

  stringWithColor_: (str, color) ->
    (color or @color_.neutral()) + str + @color_.neutral()

  printLine_: (str) ->
    @print_ str
    @print_ "\n"

exports.TerminalReporter = TerminalReporter
