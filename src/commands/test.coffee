'use strict'

fs = require 'fs'
sysPath = require 'path'
async = require 'async'
jsdom = require 'jsdom'
Mocha = require 'mocha'
chai = require 'chai'
sinon = require 'sinon'
helpers = require '../helpers'
watch = require './watch'

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
      jsdom.env
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
    # TODO: configurable reporter and interface
    mocha.reporter('spec').ui('bdd')
    @testFiles.forEach (file) ->
      mocha.addFile file
    mocha.run (failures) ->
      process.exit if failures > 0 then 1 else 0
      
  startTestRunner: (window) =>
    testHelpersFile = sysPath.resolve sysPath.join @config.paths.root, @config.paths.test, 'test-helpers.coffee'

    sysPath.exists testHelpersFile, (exists) =>
      globals = exists and require(testHelpersFile) or {}
      globals.window = window
      
      @startMocha globals

module.exports = test = (options) ->
  watch yes, options, ->
    new BrunchTestRunner options
