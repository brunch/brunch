fs = require 'fs'
sys-path = require 'path'
logger = require '../logger'

# A file that will be compiled by brunch.
module.exports = class Source-file
  (@path, @compiler, @is-helper = no, @is-vendor = no) ->
    logger.debug "Initializing fs_utils.Source-file:", {
      @path, @is-helper, @is-vendor
    }
    @type = @compiler.type
    @compiler-name = @compiler.constructor.name
    if is-helper
      file-name = "brunch_#{@compiler-name}_#{sys-path.basename @path}"
      @real-path = @path
      @path = sys-path.join 'vendor', 'scripts', file-name
    @cache = Object.seal({data: '', dependencies: []})
    Object.freeze(this)

  _get-dependencies: (data, path, callback) ->
    fn = @compiler.get-dependencies or (-> callback null, [])
    fn data, path, callback

  # Defines a requirejs module in scripts & templates.
  # This allows brunch users to use `require 'module/name'` in browsers.
  # 
  # path - path to file, contents of which will be wrapped.
  # source - file contents.
  # 
  # Returns a wrapped string.
  _wrap: (data) ->
    if not @is-helper and not @is-vendor and @type in ['javascript', 'template']
      @path .= replace //\\\\//g '/'
      @path -= /^app\// - /\.\w*$/
      module-name = JSON.stringify @path
      """
      (this.require.define({
        #module-name: function(exports, require, module) {
          #data
        }
      }));\n
      """
    else
      if @type in <[javascript template]>
        "#data;\n"
      else
        data

  # Reads file and compiles it with compiler. Data is cached to `this.data`
  # in order to do compilation only if the file was changed.
  compile: (callback) ->
    real-path = if @is-helper then @real-path else @path
    error, buffer <~ fs.read-file real-path
    if error?
      callback "Read error: #error"
    else
      file-content = buffer.to-string!
      error, result <~ @compiler.compile file-content, @path
      if error?
        callback "Compile error: #error"
      else
        error, dependencies <~ @_get-dependencies file-content, @path
        if error?
          callback "Get-deps error: #error" if error?
        else
          @cache.dependencies = dependencies
          @cache.data = @_wrap result if result?
          callback null @cache.data
