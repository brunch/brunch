fs = require 'fs'
sysPath = require 'path'

pluginHelperCounter = 0

class exports.SourceFile
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

  compile: (callback) ->
    fs.readFile @path, (error, data) =>
      return callback error if error?
      @compiler.compile data.toString(), @path, (error, result) =>
        @data = @_wrap result if result?
        callback error, result
