fs = require 'fs'
sysPath = require 'path'
logger = require '../logger'

# A file that will be compiled by brunch.
module.exports = class SourceFile
  (@path, @compiler, @isHelper = no, @isVendor = no) ->
    logger.debug "Initializing fs_utils.SourceFile:", {
      @path, @isHelper, @isVendor
    }
    @type = @compiler.type
    @compilerName = @compiler.constructor.name
    if isHelper
      fileName = "brunch_#{@compilerName}_#{sysPath.basename @path}"
      @realPath = @path
      @path = sysPath.join 'vendor', 'scripts', fileName
    @cache = Object.seal({data: '', dependencies: []})
    Object.freeze(this)

  _getDependencies: (data, path, callback) ->
    fn = @compiler.getDependencies or (-> callback null, [])
    fn data, path, callback

  # Defines a requirejs module in scripts & templates.
  # This allows brunch users to use `require 'module/name'` in browsers.
  # 
  # path - path to file, contents of which will be wrapped.
  # source - file contents.
  # 
  # Returns a wrapped string.
  _wrap: (data) ->
    if not @isHelper and not @isVendor and @type in ['javascript', 'template']
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
      if @type in ['javascript', 'template']
        "#{data};\n"
      else
        data

  # Reads file and compiles it with compiler. Data is cached to `this.data`
  # in order to do compilation only if the file was changed.
  compile: (callback) ->
    realPath = if @isHelper then @realPath else @path
    error, buffer <~ fs.readFile realPath
    if error?
      callback "Read error: #{error}"
    else
      fileContent = buffer.toString()
      error, result <~ @compiler.compile fileContent, @path
      if error?
        callback "Compile error: #{error}"
      else
        error, dependencies <~ @_getDependencies fileContent, @path
        if error?
          callback "GetDeps error: #{error}" if error?
        else
          @cache.dependencies = dependencies
          @cache.data = @_wrap result if result?
          callback null, @cache.data
