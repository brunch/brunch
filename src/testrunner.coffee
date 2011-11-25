util = require 'util'
fs = require 'fs'
path = require 'path'
coffee = require 'coffee-script'
jsdom = require 'jsdom'

helpers = require './helpers'
{TerminalReporter} = require '../vendor/reporter'

compileSpecFile = (filepath) ->
  extension = path.extname filepath
  content = fs.readFileSync filepath, 'utf-8'
  if extension is '.coffee'
    coffee.compile content
  else
    content

getSpecFiles = (specs, file) ->
  filepath = path.join dir, file
  if fs.statSync(filepath).isDirectory()
    fs.readdirSync(filepath).reduce getSpecFiles, specs
  else
    specs.push compileSpecFile filepath
  specs

exports.run = (options, callback) ->
  brunchdir = path.resolve options.appPath
  testdir = path.join brunchdir, 'test'
  helpers.log "Running tests in #{testdir}"
  # Compiles specs in `dir` and appends the result to `specs`.
  specs = fs.readdirSync(testdir).reduce getSpecFiles, []
  # Run specs in fake browser.
  jsdom.env
    html: path.join brunchdir, 'index.html'
    scripts: [
      path.resolve options.buildPath, 'web/js/app.js'
      path.resolve __dirname, '../vendor/jasmine.js'
    ]
    src: specs
    done: (error, window) ->
      helpers.logError error if error?
      # If we're testing brunch itself, we don't need to view the output.
      # TODO: move this to TerminalReporter.
      stream = if global.jasmine then (->) else util.print

      jasmineEnv = window.jasmine.getEnv()
      jasmineEnv.reporter = new TerminalReporter
        print: stream
        verbose: options.verbose
        color: yes
        onComplete: null
        stackFilter: null
      jasmineEnv.execute()
      callback?()
