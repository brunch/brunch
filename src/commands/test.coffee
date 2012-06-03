fs = require 'fs'
path = require 'path'
jsdom = require 'jsdom'
Mocha = require 'mocha'
chai = require 'chai'
helpers = require '../helpers'
watch = require './watch'

class BrunchTestRunner
  constructor: (options) ->
    @config = helpers.loadConfig options.configPath
    @setup_jsdom @start_mocha
    
  setup_jsdom: (callback) ->
    html = fs.readFileSync path.join @config.paths.public, 'index.html'
    vendorjs = fs.readFileSync path.join @config.paths.public, 'javascripts', 'vendor.js'
    appjs = fs.readFileSync path.join @config.paths.public, 'javascripts', 'app.js'

    jsdom.env
      html: html.toString(),
      src: [
        vendorjs.toString(),
        appjs.toString()
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
  # TODO: call watch() directly
  # but this somehow exits the process and
  # doesn't wait for callbacks

  child = require('child_process').fork path.join(__dirname, '..', '..', 'bin', 'brunch'), ['build']
  child.on 'exit', ->
    new BrunchTestRunner options
