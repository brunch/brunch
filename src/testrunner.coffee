util = require 'util'
fs = require 'fs'
path = require 'path'
coffee = require 'coffee-script'
jsdom = require 'jsdom'

helpers = require './helpers'
{TerminalReporter} = require '../vendor/reporter'

compileSpecFile = (filePath) ->
  extension = path.extname filePath
  content = fs.readFileSync filePath, 'utf-8'
  if extension is '.coffee'
    coffee.compile content
  else if extension is '.js'
    content

let directorySpecs directory specs file =
  let filePath = path.join directory file
  if fs.statSync(filePath).isDirectory()
    fs.readdirSync(filePath).reduce getDirectorySpecs(filePath), specs
  else
    specs.push compileSpecFile filePath
  specs

getDirectorySpecs = (directory) -> (specs, file) ->
  filePath = path.join directory, file
  if fs.statSync(filePath).isDirectory()
    fs.readdirSync(filePath).reduce getDirectorySpecs(filePath), specs
  else
    specs.push compileSpecFile filePath
  specs

getSpecFiles = (testPath) ->
  getDirectorySpecs(testPath) [], ''

exports.run = (options, callback) ->
  brunchPath = path.resolve options.appPath
  testPath = path.join brunchPath, 'test'
  helpers.log "Running tests in #{testPath}"
  # Compiles specs in `dir` and appends the result to `specs`.
  specs = getSpecFiles testPath
  # Run specs in fake browser.
  jsdom.env
    html: path.join brunchPath, 'index.html'
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
