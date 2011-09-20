require.paths.unshift __dirname + "/../src"

fs = require "fs"
path = require "path"
_ = require "underscore"
zombie = require "zombie"
{spawn} = require "child_process"

brunch  = require "../src/brunch"

# TODO split into smaller tests
# watching in general (generate a valid brunch app)
# watching with a nested brunch path
# add check if dispatch is called when js, coffee, styl, template file change
# add check for different buildPath
# add test for base template as well (obstacle: zombie currently doesn"t support file://)
describe "project watching", ->
  options = {}
  expressProcess = {}

  beforeEach ->
    stitch =
      filePattern: [/\.coffee$/, /src\/.*\.js$/, /\.eco$/]
      dependencies: [
        "ConsoleDummy.js"
        "jquery-1.6.2.js"
        "underscore-1.1.7.js"
        "backbone-0.5.3.js"
      ]
      minify: false
      output: 'build/web/js/app.js'

    options =
      stitch: stitch

    brunch.new "brunch", ->
      brunch.watch "brunch", options

      expressProcess = spawn "coffee", [
        path.join(__dirname, "server", "server.coffee"),
        "8080",
        path.join(__dirname, "..", "brunch")
      ]
    # TODO: use waitsFor(3)
    waits 2000

  afterEach ->
    removed = no
    expressProcess.kill "SIGHUP" unless expressProcess is {}
    removeDirectory "brunch", -> removed = yes
    waitsFor (-> removed), "Cannot remove", 200

  it "should create a valid brunch app", ->
    visited = no
    result = ""
    zombie.visit "http://localhost:8080", (error, browser, status) ->
      throw error.message if error
      result = browser.html "h1"
      visited = yes
    waitsFor (-> visited), "Cannot visit the localhost", 2000
    runs -> expect(result).toEqual "<h1>brunch</h1>"

  describe "should update package dependencies", ->
    ###
    # This test was broken from version 0.8.0. TODO: Fix this.
    it "when file has been added", ->
      fs.writeFileSync "brunch/src/vendor/anotherLib.js", "//anotherLib", "utf8"
      app = fs.readFileSync "brunch/build/web/js/app.js", "utf8"
      waitsFor (-> !!app), "", 400
      runs -> expect("").toMatch /\/\/anotherLib/
    ###

    it "when file has been removed", ->
      fs.writeFileSync "brunch/src/vendor/anotherLib.js", "//anotherLib", "utf8"
      fs.unlinkSync "brunch/src/vendor/anotherLib.js"
      app = fs.readFileSync "brunch/build/web/js/app.js", "utf8"
      waitsFor (-> !!app), "", 400
      runs -> expect(app).not.toMatch /\/\/anotherLib/

  it "should work properly when minified", ->
    options.stitch = _.extend options.stitch, minify: true
    brunch.watch options
    visited = no
    result = ""
    zombie.visit "http://localhost:8080", (error, browser, status) ->
      throw error.message if error
      result = browser.html "h1"
      visited = yes
    waitsFor (-> visited), "Cannot visit the localhost", 2000
    runs -> expect(result).toEqual "<h1>brunch</h1>"
