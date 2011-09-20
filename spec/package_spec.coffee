require.paths.unshift __dirname + "/../src"

package = require "../src/package"

describe "brunch", ->
  it "version number should be a string", ->
    expect(typeof package.version).toEqual "string"
