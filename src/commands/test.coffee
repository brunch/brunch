'use strict'

os = require 'os'
fs = require 'fs'
sysPath = require 'path'
async = require 'async'
Mocha = require 'mocha'
fs_utils = require '../fs_utils'
helpers = require '../helpers'
watch = require './watch'

showJsdomNote = ->
  osMessage = ->
    if os.platform() is 'win32'
      """
\nBefore installing jsdom, you have to install the following dependencies:
* Python 2.7
* Microsoft Visual Studio or Visual C++ Express\n
Once you have installed the dependencies, enter the following in your terminal (in the current directory):
"""
    else
      "In order to run tests in a CLI/jsdom environment, you have to install jsdom."

  console.log """


#{osMessage()}

a) Install jsdom for all system packages (recommended):
  * Execute `npm install -g jsdom`
  * Add the parent dir of jsdom to NODE_PATH environment var,
  like `export NODE_PATH=/usr/local/lib/node_modules`
b) Install jsdom locally for this project:
  * Execute `npm install jsdom`
"""

safeRequire = (module) ->
  try
    require module

# Try to load JSDom from global npm packages or local node_modules directory
loadJsdom = ->
  altPath = './node_modules/jsdom'  # Relative to brunch app dir.
  jsdom = safeRequire('jsdom') or safeRequire(sysPath.resolve altPath)

  if jsdom
    jsdom
  else
    showJsdomNote()
    process.exit 1

# Get all <script> files from public/index.html
getScriptFilesPath = (htmlFile, callback) ->
  document = loadJsdom().jsdom htmlFile, null,
    features:
      QuerySelector: true
  window = document.createWindow()

  window.document.querySelectorAll('script[src]')
    .map (script) ->
      script.src

# Read requires public files
readTestFiles = (publicPath, callback) ->
  getPublicPath = (subPaths...) ->
    sysPath.join publicPath, subPaths...

  fs.readFile getPublicPath('index.html'), (error, buffer) ->
    throw error if error?

    htmlFile = buffer.toString()
    scriptFilesPath = getScriptFilesPath(htmlFile).map getPublicPath

    async.map scriptFilesPath, fs.readFile, (error, buffers) ->
      return callback error if error?
      scripts = buffers
        .filter((buffer) -> buffer?)
        .map((buffer) -> buffer.toString())
      callback null, htmlFile, scripts

# Setup JSDom instance with public files
setupJsDom = (publicPath, callback) ->
  readTestFiles publicPath, (error, htmlFile, scriptFiles) ->
    throw error if error?

    loadJsdom().env
      html: htmlFile,
      src: scriptFiles,
      done: (error, window) ->
        throw error if error?
        callback window

# Start mocha with given testFiles
# All tests can access the exposed global variables (test-helpers like chai, sinon)
startMocha = (config, options, testFiles, globals) ->
  helpers.extend global, globals

  mocha = new Mocha()
  mocha
    .reporter(options.reporter or config.test?.reporter or 'spec')
    .ui(config.test?.ui ? 'bdd')
  testFiles.forEach (file) ->
    mocha.addFile file
  mocha.run (failures) ->
    process.exit (if failures > 0 then 1 else 0)

# Load the test-helpers.* file
findTestHelpersFile = (testPath, callback) ->
  fs.readdir testPath, (error, files) ->
    throw error if error?

    testHelpers = files.filter (file) ->
      /^test[-_]helpers?\./.test file

    if testHelpers.length > 0
      callback sysPath.resolve sysPath.join testPath, testHelpers[0]
    else
      callback null

startBrunchTestRunner = (config, options) ->
  testFiles = helpers.findTestFiles config
  throw new Error("Can't find tests for this project.") if testFiles.length is 0

  setupJsDom config.paths.public, (window) =>
    findTestHelpersFile config.paths.test, (testHelpersFile) =>
      globals = if testHelpersFile? then require(testHelpersFile) else {}
      globals.window = window
      startMocha config, options, testFiles, globals

module.exports = test = (options) ->
  watcher = watch yes, options, ->
    startBrunchTestRunner watcher.config, options
