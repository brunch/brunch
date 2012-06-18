'use strict'

os = require 'os'
fs = require 'fs'
sysPath = require 'path'
async = require 'async'
Mocha = require 'mocha'
fs_utils = require '../fs_utils'
helpers = require '../helpers'
watch = require './watch'

loadJsdom = ->
  showJsdomNote = ->
    console.log '\n\nIn order to run tests in a CLI/jsdom environment, you have to install jsdom.'

    if os.platform() is 'win32'
      console.log '\nBefore installing jsdom, you have to install the following dependencies:'
      console.log '* Python 2.7'
      console.log '* Microsoft Visual Studio or Visual C++ Express\n'
      console.log 'Once you have installed the dependencies, enter the following in your terminal (in the current directory):'
    else
      console.log 'Enter the following in your terminal (in the current directory):'
      
    console.log '\nnpm install jsdom'
    
  try
    require sysPath.resolve './node_modules/jsdom'
  catch error
    showJsdomNote()
    process.exit 1

class BrunchTestRunner
  constructor: (options) ->
    @config = helpers.loadConfig options.configPath
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
      .reporter(@config.test?.reporter ? 'spec')
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
  watch yes, options, ->
    new BrunchTestRunner options
