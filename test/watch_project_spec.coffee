fs = require 'fs'
path = require 'path'
_ = require 'underscore'
zombie = require 'zombie'
{spawn} = require 'child_process'

brunch  = require '../src/brunch'


# TODO split into smaller tests
# watching in general (generate a valid brunch app)
# watching with a nested brunch path
# add check if dispatch is called when js, coffee, styl, template file change
# add check for different buildPath
# add test for base template as well (obstacle: zombie currently doesn't support file://)
describe 'project watcher', ->
  options = {}
  expressProcess = null
  application = null

  beforeEach ->
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
        return if expressProcess?
        expressProcess = spawn 'coffee', [
          path.join(__dirname, 'server', 'server.coffee'),
          '8080',
          path.join(__dirname, '..', 'brunch', 'build')
        ]
    #waitsFor (-> 'killed' of expressProcess), 'Cannot run express', 2000
    waits 1500

  afterEach ->
    removed = no
    application.stopWatching()
    application = null
    expressProcess?.kill? 'SIGHUP'
    expressProcess = null
    removeDirectory 'brunch', -> removed = yes
    waitsFor (-> removed), 'Cannot remove', 200

  it 'should create a valid brunch app', ->
    visited = no
    result = ''
    zombie.visit 'http://localhost:8080', (error, browser, status) ->
      return error.message if error
      result = browser.html 'h1'
      visited = yes
    waitsFor (-> visited), 'Cannot visit the localhost', 2000
    runs -> expect(result).toEqual '<h1>brunch</h1>'
  
  describe 'should update app.js', ->
    it 'when file has been added', ->
      fs.writeFileSync 'brunch/src/vendor/anotherLib.js', '//anotherLib', 'utf8'
      app = fs.readFileSync 'brunch/build/web/js/app.js', 'utf8'
      waitsFor (-> !!app), '', 400
      
    it 'when file has been removed', ->
      fs.writeFileSync 'brunch/src/vendor/anotherLib.js', '//anotherLib', 'utf8'
      fs.unlinkSync 'brunch/src/vendor/anotherLib.js'
      app = fs.readFileSync 'brunch/build/web/js/app.js', 'utf8'
      waitsFor (-> !!app), '', 400
      runs ->
        expect(app).not.toMatch /\/\/anotherLib/

    it 'when template has been changed', ->
      text = 'some_random_text10'
      fs.writeFileSync 'brunch/src/app/templates/home.eco', text, 'utf8'
      waits 200
      runs ->
        app = fs.readFileSync 'brunch/build/web/js/app.js', 'utf8'
        expect(app).toMatch ///#{text}///

  it 'should work properly when minified', ->
    application.options.minify = yes
    visited = no
    result = ''
    zombie.visit 'http://localhost:8080', (error, browser, status) ->
      return error.message if error
      result = browser.html 'h1'
      visited = yes
    waitsFor (-> visited), 'Cannot visit the localhost', 2000
    runs -> expect(result).toEqual '<h1>brunch</h1>'
