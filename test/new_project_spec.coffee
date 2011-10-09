require.paths.unshift __dirname + "/../src"

fs = require "fs"

brunch  = require "../src/brunch"


describe "new project", ->
  describe "default", ->
    beforeEach ->
      created = no
      brunch.new
        appPath: "brunch"
        buildPath: "brunch/build"
      , -> created = yes
      waitsFor (-> created), 400

    afterEach ->
      removed = no
      removeDirectory "brunch", -> removed = yes
      waitsFor (-> removed), "Cannot remove directory", 200
    
    it "should be created", ->
      #expect(typeof fs.statSync "brunch").toEqual "object"
      #expect(typeof fs.statSync "brunch/build").toEqual "object"

  describe "with nested directories", ->
    beforeEach ->
      created = no
      brunch.new
        appPath: "js/client"
        buildPath: "js/output"
      , -> created = yes
      waitsFor (-> created), 400

    afterEach ->
      removed = no
      removeDirectory "js", -> removed = yes
      waitsFor (-> removed), "Cannot remove directory", 200
    
    it "should be created", ->
      expect(typeof fs.statSync "js/client/src").toEqual "object"
      expect(typeof fs.statSync "js/output").toEqual "object"
