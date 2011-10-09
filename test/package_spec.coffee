package = require "../src/package"


describe "brunch", ->
  it "version number should be a string", ->
    expect(typeof package.version).toEqual "string"
