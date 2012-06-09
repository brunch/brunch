async = require 'async'
chokidar = require 'chokidar'
sys-path = require 'path'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

is-compiler-for = (path, plugin) ->
  pattern = if plugin.pattern
    plugin.pattern
  else if plugin.extension
    //\.#{plugin.extension}$//
  else
    null
  (typeof plugin.compile is 'function') and !!(pattern?.test path)

call-orPass = (item) ->
  if typeof item is 'function'
    item()
  else
    item

ensure-array = (item) ->
  if Array.is-array(item) then item else [item]

get-plugin-includes = (plugins) ->
  plugins
    |> lookup 'include'
    |> call-orPass
    |> filter (paths) -> paths?
    |> concat-map ensure-array

class Brunch-watcher
  (@persistent, @options, @_on-compile) ->
    params = {}
    params.minify = yes if options.minify
    params.persistent = persistent
    if persistent
      params.server = {}
      params.server.run = yes if options.server
      params.server.port = options.port if options.port
    @config = helpers.load-config options.config-path, params

  clone: ->
    new Brunch-watcher(@persistent, @options, @on-compile)

  init-server: ->
    if @persistent and @config.server.run
      @server = helpers.start-server @config

  init-file-list: ->
    @file-list = new fs_utils.File-list @config

  init-plugins: (callback) ->
    helpers.load-plugins @config, (error, plugins) ~>
      return logger.error error if error?
      @plugins = plugins
      callback error

  change-file-list: (path, is-helper = no) ~>
    @start = Date.now()
    compiler = @plugins.filter(is-compiler-for.bind(null, path))[0]
    @file-list.emit 'change', path, compiler, is-helper

  remove-from-file-list: (path) ~>
    @start = Date.now()
    @file-list.emit 'unlink', path

  init-watcher: (callback) ->
    watched = [
      @config.paths.app, @config.paths.vendor, @config.paths.test,
      @config.paths.config, @config.paths.package-config
    ] +++ @config.paths.assets

    async.filter watched, fs_utils.exists, (watched-files) ~>
      ignored = fs_utils.ignored
      @watcher = chokidar.watch(watched-files, {ignored, @persistent})
        .on 'add', (path) ~>
          logger.debug "File '#{path}' received event 'add'"
          @change-file-list path, no
        .on 'change', (path) ~>
          logger.debug "File '#{path}' received event 'change'"
          if path is @config.paths.config
            @reload no
          else if path is @config.paths.package-config
            @reload yes
          else
            @change-file-list path, no
        .on 'unlink', (path) ~>
          logger.debug "File '#{path}' received event 'unlink'"
          if path in [@config.paths.config, @config.paths.package-config]
            logger.info "Detected removal of config.coffee / package.json.
 Exiting."
            process.exit(0)
          else
            @remove-from-file-list path
        .on('error', logger.error)

  on-compile: (result) ~>
    @_on-compile result
    @plugins
      |> lookup 'on-compile'
      |> filter (callback) -> typeof callback is 'function'
      |> each (callback) -> callback result

  compile: ~>
    fs_utils.write @file-list, @config, @plugins, (error, result) ~>
      return logger.error "Write failed: #{error}" if error?
      logger.info "compiled in #{Date.now() - @start}ms"
      @watcher.close() unless @persistent
      @on-compile result

  watch: ->
    @init-server()
    @init-plugins ~>
      @init-file-list()
      get-plugin-includes(@plugins).for-each((path) ~> @change-file-list path, yes)
      @init-watcher()
      @file-list.on 'ready', @compile

  close: ->
    @server?.close()
    @watcher.close()

  reload: (re-install = no) ->
    re-watch = ~>
      @close()
      @clone().watch()
    if re-install
      helpers.install @config.paths.root, re-watch
    else
      re-watch()

module.exports = watch = (persistent, options, callback = (->)) ->
  deprecated = (param) ->
    if options[param]
      logger.warn "--#{param} is deprecated. Use config option."
  deprecated 'output'
  new Brunch-watcher(persistent, options, callback).watch()
