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

loadJsdom = ->
  altPath = './node_modules/jsdom'  # Relative to brunch app dir.
  jsdom = safeRequire('jsdom') or safeRequire(sysPath.resolve altPath)

  if jsdom
    jsdom
  else
    showJsdomNote()
    process.exit 1

# Read requires public files
readTestFiles = (publicPath, callback) ->
  getPublicPath = (subPaths...) ->
    sysPath.join publicPath, subPaths...
  files = [
    getPublicPath('index.html'),
    getPublicPath('javascripts', 'vendor.js'),
    getPublicPath('javascripts', 'app.js')
  ]
  async.map files, fs.readFile, callback

# Setup JSDom instance with public files
# (HTML and JS) loaded
setupJsDom = (publicPath, callback) ->
  readTestFiles publicPath, (error, files) ->
    throw error if error?
    [html, vendorjs, appjs] = files
    
    loadJsdom().env
      html: html.toString(),
      src: [
        vendorjs.toString(),
        appjs.toString()
      ],
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
  testFiles.forEach (file) =>
    mocha.addFile file
  mocha.run (failures) =>
    process.exit (if failures > 0 then 1 else 0)

# Load the test-helpers.coffee or test-helpers.js file
findTestHelpersFile = (testPath, callback) ->
  getTestHelpersPath = (filename) =>
    sysPath.resolve sysPath.join testPath, filename
      
  testHelpersFiles = [
    getTestHelpersPath('test-helpers.coffee'),
    getTestHelpersPath('test-helpers.js')
  ]
  
  async.detect testHelpersFiles, fs_utils.exists, callback
    
    
startBrunchTestRunner = (config, options) ->
  testFiles = helpers.findTestFiles config
  throw new Error("Can't find tests for this project.") if testFiles.length == 0
    
  setupJsDom config.paths.public, (window) =>
    findTestHelpersFile config.paths.test, (testHelpersFile) =>
      globals = if testHelpersFile? then require(testHelpersFile) else {}
      globals.window = window
      startMocha config, options, testFiles, globals

module.exports = test = (options) ->
  watcher = watch yes, options, ->
    startBrunchTestRunner watcher.config, options
