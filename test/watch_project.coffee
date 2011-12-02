fs = require 'fs'
path = require 'path'
_ = require 'underscore'
zombie = require 'zombie'
{spawn} = require 'child_process'

brunch  = require '../src/brunch'
specHelpers = require './spec_helpers'


# TODO split into smaller tests
# watching in general (generate a valid brunch app)
# watching with a nested brunch path
# add check if dispatch is called when js, coffee, styl, template file change
# add check for different buildPath
# add test for base template as well (obstacle: zombie currently doesn't support file://)
describe 'project watcher', ->
  options = {}
  server = null
  application = null

  beforeEach (done) ->
    options =
      appPath: 'brunch'
      buildPath: 'brunch/build'
      minify: no
      templateExtension: 'eco'

    application = brunch.new options, (application) ->
      application.options.dependencies = [
        'ConsoleDummy.js'
        'jquery-1.7.js'
        'underscore-1.1.7.js'
        'backbone-0.5.3.js'
      ]
      application.watch ->
        return if server?
        buildPath = path.join __dirname, '..', 'brunch', 'build'
        server = specHelpers.runServer buildPath, done

  afterEach (done) ->
    application.stopWatching()
    application = null
    server.close()
    server = null
    specHelpers.removeDirectory 'brunch', done

  it 'should create a valid brunch app', (done) ->
    visited = no
    result = ''
    zombie.visit 'http://localhost:8080', (error, browser, status) ->
      throw error if error?
      (browser.html 'body').should.eql '<h1>brunch</h1>'
      done()

  describe 'should update app.js', ->
    #it 'when file has been added', ->
    #  fs.writeFileSync 'brunch/src/vendor/anotherLib.js', '//anotherLib', 'utf8'
    #  app = fs.readFileSync 'brunch/build/web/js/app.js', 'utf8'
    #  waitsFor (-> !!app), '', 400
      
    it 'when file has been removed', ->
      fs.writeFileSync 'brunch/src/vendor/anotherLib.js', '//anotherLib', 'utf8'
      fs.unlinkSync 'brunch/src/vendor/anotherLib.js'
      app = fs.readFileSync 'brunch/build/web/js/app.js', 'utf8'
      app.should.not.match /\/\/anotherLib/

    it 'when template has been changed', ->
      text = 'some_random_text10'
      fs.writeFileSync 'brunch/src/app/templates/home.eco', text, 'utf8'
      app = fs.readFileSync 'brunch/build/web/js/app.js', 'utf8'
      app.should.match ///#{text}///

  it 'should work properly when minified', (done) ->
    application.options.minify = yes
    zombie.visit 'http://localhost:8080', (error, browser, status) ->
      throw error if error?
      result = browser.html 'h1'
      result.should.eql '<h1>brunch</h1>'
      done()
