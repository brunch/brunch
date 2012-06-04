fs = require 'fs'
sysPath = require 'path'
async = require 'async'
jsdom = require 'jsdom'
Mocha = require 'mocha'
chai = require 'chai'
helpers = require '../helpers'
watch = require './watch'

class BrunchTestRunner
  constructor: (options) ->
    @config = helpers.loadConfig options.configPath
    @setupJsDom @startMocha
    
  readTestFiles: (callback) ->
    getPublicPath = (subPaths...) ->
      sysPath.join @config.paths.public, subPaths...
    files = [
      getPublicPath('index.html'),
      getPublicPath('javascripts', 'vendor.js'),
      getPublicPath('javascripts', 'app.js')
    ]
    async.map files, fs.readFile, callback

  setupJsDom: (callback) ->
    @readTestFiles (error, files) ->
      throw error if error?
      jsdom.env
        html: files.html.toString(),
        src: [
          files.vendorjs.toString(),
          files.appjs.toString()
        ],
        done: (error, window) ->
          throw error if error?
          callback window

  startMocha: (window) =>
    global.app = window
    global.expect = chai.expect

    mocha = new Mocha()
    # TODO: configurable reporter and interface
    mocha.reporter('spec').ui('bdd')
    mocha.addFile sysPath.join @config.paths.public, 'javascripts', 'tests.js'
    mocha.run (failures) ->
      process.exit if failures > 0 then 1 else 0

module.exports = test = (options) ->
  watch yes, options, ->
    new BrunchTestRunner options
