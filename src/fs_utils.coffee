async = require 'async'
{EventEmitter} = require 'events'
fs = require 'fs'
mkdirp = require 'mkdirp'
sysPath = require 'path'
util = require 'util'
helpers = require './helpers'

# The definition would be added on top of every filewriter .js file.
requireDefinition = '''
(function(/*! Brunch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var module = cache[name], path = expand(root, name), fn;
      if (module) {
        return module;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: name, exports: {}};
        try {
          cache[name] = module.exports;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return cache[name] = module.exports;
        } catch (err) {
          delete cache[name];
          throw err;
        }
      } else {
        throw 'module \\'' + name + '\\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\\.\\.?(\\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    };
    this.require.brunch = true;
    this.require.define = function(bundle) {
      for (var key in bundle)
        modules[key] = bundle[key];
    };
  }
}).call(this);
'''

pluralize = (word) -> word + 's'

dePluralize = (word) -> word[0..word.length - 1]

# Creates file if it doesn't exist and writes data to it.
# Would also create a parent directories if they don't exist.
#
# path - path to file that would be written.
# data - data to be written
# callback(error, path, data) - would be executed on error or on
#    successful write.
# 
# Example
# 
#   writeFile 'test.txt', 'data', (error) -> console.log error if error?
# 
writeFile = (path, data, callback) ->
  write = (callback) -> fs.writeFile path, data, callback
  write (error) ->
    return callback null, path, data unless error?
    mkdirp (sysPath.dirname path), (parseInt 755, 8), (error) ->
      return callback error if error?
      write (error) ->
        callback error, path, data

exports.File = class File
  constructor: (@path, @compiler) ->
    @type = @compiler.compilerType
    @data = ''
    @disableWrapping = !(/^vendor/.test @path)

  # Defines a requirejs module in scripts & templates.
  # This allows brunch users to use `require 'module/name'` in browsers.
  # 
  # path - path to file, contents of which will be wrapped.
  # source - file contents.
  # 
  # Returns a wrapped string.
  _wrap: (data) ->
    if @type in ['javascript', 'template'] and @disableWrapping
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

exports.FileList = class FileList extends EventEmitter
  constructor: ->
    @files = []

  resetTimer: ->
    clearTimeout @timer if @timer?
    @timer = setTimeout (=> @emit 'resetTimer'), 150

  get: (searchFunction) ->
    (@files.filter searchFunction)[0] 

  add: (file) ->
    @files = @files.concat [file]
    compilerName = file.compiler.constructor.name
    file.compile (error, result) =>
      if error?
        return helpers.logError "#{compilerName} error in '#{file.path}': 
#{error}"
      @resetTimer()

  remove: (path) ->
    removed = @get (file) -> file.path is path
    @files = @files.filter (file) -> file isnt removed
    delete removed
    @resetTimer()

class GeneratedFile
  constructor: (@path, @sourceFiles, @config) ->
    @type = if (@sourceFiles.some (file) -> file.type is 'javascript')
      'javascript'
    else
      'stylesheet'

  _extractOrder: (files, config) ->
    types = files.map (file) -> pluralize file.type
    arrays = (value.order for own key, value of config.files when key in types)
    arrays.reduce (memo, array) ->
      array or= {}
      {
        before: memo.before.concat(array.before or []),
        after: memo.after.concat(array.after or [])
      }
    , {before: [], after: []}

  # Collects content from a list of files and wraps it with
  # require.js module definition if needed.
  joinSourceFiles: ->
    files = @sourceFiles
    pathes = files.map (file) -> file.path
    order = @_extractOrder files, @config
    sourceFiles = (helpers.sort pathes, order).map (file) ->
      files[pathes.indexOf file]
    data = ''
    data += requireDefinition if @type is 'javascript'
    data += sourceFiles.map((file) -> file.data).join ''
    data

  minify: (data, callback) ->
    if @minifier?.minify?
      @minifier.minify data, @path, callback
    else
      callback null, data

  write: (callback) ->
    @minify @joinSourceFiles(), (error, data) =>
      writeFile @path, data, callback

# A simple file changes watcher.
# 
# files - array of directories that would be watched.
# 
# Example
# 
#   (new FSWatcher ['app', 'vendor'])
#     .on 'change', (file) ->
#       console.log 'File %s was changed', file
# 
class exports.FSWatcher extends EventEmitter
  # RegExp that would filter invalid files (dotfiles, emacs caches etc).
  invalid: /^(\.|#)/

  constructor: (files) ->
    @watched = {}
    @_handle file for file in files

  _getWatchedDir: (directory) ->
    @watched[directory] ?= []

  _watch: (item, callback) ->
    parent = @_getWatchedDir sysPath.dirname item
    basename = sysPath.basename item
    # Prevent memory leaks.
    return if basename in parent
    parent.push basename
    fs.watchFile item, persistent: yes, interval: 100, (curr, prev) =>
      if curr.mtime.getTime() isnt prev.mtime.getTime()
        callback? item

  _handleFile: (file) ->
    emit = (file) =>
      @emit 'change', file
    emit file
    @_watch file, emit

  _handleDir: (directory) ->
    read = (directory) =>
      fs.readdir directory, (error, current) =>
        return helpers.logError error if error?
        return unless current
        previous = @_getWatchedDir directory
        previous
          .filter (file) ->
            file not in current
          .forEach (file) =>
            @emit 'remove', sysPath.join directory, file

        current
          .filter (file) ->
            file not in previous
          .forEach (file) =>
            @_handle sysPath.join directory, file
    read directory
    @_watch directory, read

  _handle: (file) ->
    return if @invalid.test sysPath.basename file
    fs.realpath file, (error, path) =>
      return helpers.logError error if error?
      fs.stat file, (error, stats) =>
        return helpers.logError error if error?
        @_handleFile file if stats.isFile()
        @_handleDir file if stats.isDirectory()

  on: ->
    super
    this

  # Removes all listeners from watched files.
  close: ->
    for directory, files of @watched
      for file in files
        fs.unwatchFile sysPath.join directory, file
    @watched = {}
    this

class exports.FileWriter extends EventEmitter
  constructor: (@config, @plugins) ->
    @destFiles = []
    @_initFilesConfig @config.files

  _initFilesConfig: (filesConfig) ->
    # Copy config.
    config = helpers.extend filesConfig, {}
    for own type, data of config
      if typeof data.joinTo is 'string'
        object = {}
        object[data.joinTo] = /.+/
        data.joinTo = object
      for own destinationPath, regExpOrFunction of data.joinTo
        data.joinTo[destinationPath] = if typeof regExpOrFunction is 'function'
          regExpOrFunction
        else
          (string) -> regExpOrFunction.test string
    config

  _getDestinationPathes: (file) ->
    pathes = []
    data = @config.files[pluralize file.type]
    for own destinationPath, tester of data.joinTo when tester file.path
      pathes.push destinationPath
    if pathes.length > 0 then pathes else null

  _getFiles: (fileList, minifiers) ->
    map = {}
    fileList.files.forEach (file) =>
      pathes = @_getDestinationPathes file
      return unless pathes?
      pathes.forEach (path) =>
        map[path] ?= []
        map[path].push file
    files = []
    for generatedFilePath, sourceFiles of map
      generatedFilePath = sysPath.join @config.buildPath, generatedFilePath
      file = new GeneratedFile generatedFilePath, sourceFiles, @config
      for minifier in minifiers when minifier.minifierType is file.type
        file.minifier = minifier
      files.push file
    files

  write: (fileList) =>
    files = @_getFiles fileList, @plugins.filter (plugin) -> !!plugin.minify
    write = (file, callback) -> file.write callback
    async.forEach files, write, (error, results) =>
      return helpers.logError "write error. #{error}" if error?
      @emit 'write', results
