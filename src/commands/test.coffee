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

loadJsdom = ->
  try
    require 'jsdom'
  catch error
    showJsdomNote()
    process.exit 1

class BrunchTestRunner
  constructor: (@config, @options) ->
    @testFiles = helpers.findTestFiles @config

    if @testFiles.length > 0
      @setupJsDom @startTestRunner
    else
      throw new Error("Can't find tests for this project.")

  readTestFiles: (callback) =>
    getPublicPath = (subPaths...) =>
      sysPath.join @config.paths.public, subPaths...
    files = [
      getPublicPath('index.html'),
      getPublicPath('javascripts', 'vendor.js'),
      getPublicPath('javascripts', 'app.js')
    ]
    async.map files, fs.readFile, callback

  setupJsDom: (callback) =>
    @readTestFiles (error, files) ->
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

  startMocha: (globals) =>
    helpers.extend global, globals

    mocha = new Mocha()
    mocha
      .reporter(@options.reporter or @config.test?.reporter or 'spec')
      .ui(@config.test?.ui ? 'bdd')
    @testFiles.forEach (file) =>
      mocha.addFile file
    mocha.run (failures) =>
      process.exit (if failures > 0 then 1 else 0)

  startTestRunner: (window) =>
    getTestHelpersPath = (filename) =>
      sysPath.resolve sysPath.join @config.paths.test, filename

    testHelpersFiles = [
      getTestHelpersPath 'test-helpers.coffee',
      getTestHelpersPath 'test-helpers.js'
    ]
    
    async.detect testHelpersFiles, fs_utils.exists, (testHelpersFile) =>
      globals = if testHelpersFile? then require(testHelpersFile) else {}
      globals.window = window
      @startMocha globals

module.exports = test = (options) ->
  watcher = watch yes, options, ->
    new BrunchTestRunner watcher.config, options
