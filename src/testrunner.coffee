sys = require 'sys'
fs = require 'fs'
path = require 'path'
coffee = require 'coffee-script'
jsdom = require 'jsdom'

helpers = require './helpers'
{TerminalReporter} = require '../vendor/reporter'


exports.run = (options, callback) ->
  brunchdir = path.resolve options.appPath
  testdir = path.join brunchdir, 'test'
  specs = []
  helpers.log "Running tests in #{testdir}"
  # Compiles specs in `dir` and appends the result to `specs`.
  getSpecFiles = (dir) ->
    for f in fs.readdirSync dir
      filepath = path.join dir, f
      ext = path.extname filepath
      if ext in ['.coffee', '.js']
        spec = fs.readFileSync filepath, 'utf-8'
        spec = coffee.compile spec if ext is '.coffee'
        specs.push spec
      else if fs.statSync(filepath).isDirectory()
        getSpecFiles filepath

  getSpecFiles testdir

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
      stream = if global.jasmine then (->) else sys.print

      jasmineEnv = window.jasmine.getEnv()
      jasmineEnv.reporter = new TerminalReporter
        print: stream
        verbose: options.verbose
        color: yes
        onComplete: null
        stackFilter: null
      jasmineEnv.execute()
      callback?()
