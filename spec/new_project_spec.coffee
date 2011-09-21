require.paths.unshift __dirname + "/../src"

fs = require "fs"

brunch  = require "../src/brunch"


describe "new project", ->
  describe "default", ->
    beforeEach ->
      created = no
      brunch.new
        brunchPath: "brunch"
        buildPath: "brunch/build"
        projectTemplate: "base"
        templateExtension: "eco"
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
        brunchPath: "js/client"
        buildPath: "js/output"
        projectTemplate: "base"
        templateExtension: "eco"
      , -> created = yes
      waitsFor (-> created), 400

    afterEach ->
      removed = no
      removeDirectory "js", -> removed = yes
      waitsFor (-> removed), "Cannot remove directory", 200
    
    it "should be created", ->
      expect(typeof fs.statSync "js/client/src").toEqual "object"
      expect(typeof fs.statSync "js/output").toEqual "object"
