fs = require 'fs'
sys-path = require 'path'
async = require 'async'
jsdom = require 'jsdom'
Mocha = require 'mocha'
chai = require 'chai'
helpers = require '../helpers'
watch = require './watch'

class Brunch-test-runner
  (options) ->
    @config = helpers.load-config options.config-path
    @setup-jsDom @start-mocha
    
  read-test-files: (callback) ~>
    get-public-path = (sub-paths...) ~>
      sys-path.join @config.paths.public, sub-paths...
    files =
      * get-public-path 'index.html'
      * get-public-path 'javascripts' 'vendor.js'
      * get-public-path 'javascripts' 'app.js'
    async.map files, fs.read-file, callback

  setup-jsDom: (callback) ~>
    @read-test-files (error, files) ->
      throw error if error?
      [html, vendorjs, appjs] = files
      jsdom.env do
        html: html.to-string!
        src:
          * vendorjs.to-string!
          * appjs.to-string!
        done: (error, window) ->
          throw error if error?
          callback window

  start-mocha: (window) ~>
    global.window = window
    global.expect = chai.expect
    
    with mocha = new Mocha!
    # TODO: configurable reporter and interface
      @reporter 'spec' .ui 'bdd'
      @add-file sys-path.join @config.paths.public, 'javascripts', 'tests.js'
      @run (failures) ->
        process.exit if failures > 0 then 1 else 0

module.exports = test = (options) ->
  watch yes, options, ->
    new Brunch-test-runner options
