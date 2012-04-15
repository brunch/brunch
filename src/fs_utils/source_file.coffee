fs = require 'fs'
sysPath = require 'path'

pluginHelperCounter = 0

# A file that will be compiled by brunch.
module.exports = class SourceFile
  constructor: (@path, @compiler) ->
    @type = @compiler.type
    @data = ''
    @isPluginHelper = no
    @dependencies = []

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
          @path
            .replace(new RegExp('\\\\', 'g'), '/')
            .replace(/^app\//, '')
            .replace(/\.\w*$/, '')
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
      return callback "Read error: #{error}" if error?
      fileContent = data.toString()
      getDeps = @compiler.getDependencies or (data, path, callback) ->
        callback(null, [])
      @compiler.compile fileContent, @path, (error, result) =>
        return callback "Compile error: #{error}" if error?
        getDeps fileContent, @path, (error, dependencies) =>
          return callback "GetDeps error: #{error}" if error?
          @dependencies = dependencies
          @data = @_wrap result if result?
          callback error, @data
