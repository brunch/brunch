async = require 'async'
sys-path = require 'path'
inflection = require 'inflection'
Generated-file = require './generated_file'
logger = require '../logger'

make-checker = (item) ->
  switch to-string.call(item)
    when '[object Reg-exp]'
      ((string) -> item.test string)
    when '[object Function]'
      item
    else
      throw new Error("Config.files item #{item} is invalid.
Use Reg-exp or Function.")

# Converts `config.files[...].join-to` to one format.
get-join-config = (config) ->
  join-config = {}
  types = Object.keys(config.files)
  types
    |> map (type) ->
      config.files[type].join-to
    |> map (join-to) ->
      if typeof join-to is 'string'
        object = {}
        object[join-to] = /.+/
        object
      else
        join-to
    |> for-each (join-to, index) ->
      cloned = {}
      Object.keys(join-to).for-each (generated-file-path) ->
        cloned[generated-file-path] = make-checker join-to[generated-file-path]
      join-config[types[index]] = cloned
  Object.freeze(join-config)

get-generated-files-paths = (source-file, join-config) ->
  source-file-join-config = join-config[inflection.pluralize source-file.type] or {}
  Object.keys(source-file-join-config).filter (generated-file-path) ->
    checker = source-file-join-config[generated-file-path]
    checker source-file.path

get-files = (file-list, config, minifiers) ->
  join-config = get-join-config config
  map = {}
  file-list.files.for-each (file) ~>
    paths = get-generated-files-paths file, join-config
    paths.for-each (path) ~>
      map[path] ?= []
      map[path].push file

  Object.keys(map).map (generated-file-path) ~>
    source-files = map[generated-file-path]
    full-path = sys-path.join config.paths.public, generated-file-path
    new Generated-file full-path, source-files, config, minifiers

# * plugins - hashmap of plugins from package.json.
module.exports = write = (file-list, config, plugins, callback) ->
  minifiers = plugins |> filter (plugin) -> Boolean plugin.minify
  files = get-files file-list, config, minifiers
  write-file = (file, callback) -> file.write callback
  error, results <- async.for-each files, write-file
  callback error, results
