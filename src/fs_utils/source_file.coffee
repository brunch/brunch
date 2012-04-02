fs = require 'fs'
sysPath = require 'path'

pluginHelperCounter = 0

# A file that will be compiled by brunch.
module.exports = class SourceFile
  constructor: (@path, @compiler) ->
    @type = @compiler.type
    @data = ''
    @isPluginHelper = no

  # Defines a requirejs module in scripts & templates.
  # This allows brunch users to use `require 'module/name'` in browsers.
  # 
  # path - path to file, contents of which will be wrapped.
  # source - file contents.
  # 
  # Returns a wrapped string.
  _wrap: (data) ->
    if @isPluginHelper
      pluginHelperCounter += 1
      fileName = "brunch_#{pluginHelperCounter}_#{sysPath.basename @path}"
      @path = sysPath.join 'vendor', 'scripts', fileName
      data
    else
      if @type in ['javascript', 'template'] and !(/^vendor/.test @path)
        moduleName = JSON.stringify(
          @path.replace(/^app\//, '').replace(/\.\w*$/, '')
        )
        """
        (this.require.define({
          #{moduleName}: function(exports, require, module) {
            #{data}
          }
        }));\n
        """
      else
        data

  # Reads file and compiles it with compiler. Data is cached to `this.data`
  # in order to do compilation only if the file was changed.
  compile: (callback) ->
    fs.readFile @path, (error, data) =>
      return callback error if error?
      @compiler.compile data.toString(), @path, (error, result) =>
        @data = @_wrap result if result?
        callback error, result
