fs = require 'fs'
path = require 'path'
async = require 'async'
jsdom = require 'jsdom'
Mocha = require 'mocha'
chai = require 'chai'
helpers = require '../helpers'
watch = require './watch'

class BrunchTestRunner
  constructor: (options) ->
    @config = helpers.loadConfig options.configPath
    @setup_jsdom @start_mocha
    
  read_testfiles: (callback) ->
    html_filename     = path.join @config.paths.public, 'index.html'
    vendorjs_filename = path.join @config.paths.public, 'javascripts', 'vendor.js'
    appjs_filename    = path.join @config.paths.public, 'javascripts', 'app.js'
    
    async.parallel
      html: (callback) ->
        fs.readFile html_filename, callback
      vendorjs: (callback) ->
        fs.readFile vendorjs_filename, callback
      appjs: (callback) ->
        fs.readFile appjs_filename, callback
    , (err, results) ->
      if err
        console.log err
        process.exit 1

      callback results
    
  setup_jsdom: (callback) ->
    @read_testfiles (files) ->
      jsdom.env
        html: files.html.toString(),
        src: [
          files.vendorjs.toString(),
          files.appjs.toString()
        ],
        done: (err, window) ->
          if err
            console.log err
            process.exit 1

          callback window

  start_mocha: (window) =>
    global.app = window
    global.expect = chai.expect

    mocha = new Mocha
    # TODO: configurable reporter and interface
    mocha.reporter('spec').ui('bdd')
    mocha.addFile path.join @config.paths.public, 'javascripts', 'tests.js'

    mocha.run (failures) ->
      process.exit if failures > 0 then 1 else 0

module.exports = test = (options) ->
  watch yes, options, ->
    new BrunchTestRunner options
