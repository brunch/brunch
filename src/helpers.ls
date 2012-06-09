{exec} = require 'child_process'
coffeescript = require 'coffee-script'
express = require 'express'
fs = require 'fs'
sys-path = require 'path'
logger = require './logger'

exports.starts-with = (string, substring) ->
  string.index-of(substring) is 0

ensure-array = (object) ->
  if Array.is-array object
    object
  else
    [object]

# Extends the object with properties from another object.
# Example
#   
#   extend {a: 5, b: 10}, {b: 15, c: 20, e: 50}
#   # ~> {a: 5, b: 15, c: 20, e: 50}
# 
exports.extend = extend = (object, properties) ->
  Object.keys(properties).for-each (key) ->
    object[key] = properties[key]
  object

recursive-extend = (object, properties) ->
  Object.keys(properties).for-each (key) ->
    value = properties[key]
    if typeof value is 'object' and value?
      recursive-extend object[key], properties[key]
    else
      object[key] = properties[key]
  object

exports.deep-freeze = deep-freeze = (object) ->
  is-frozen = (value) ->
    typeof value is 'object' and value? and not Object.is-frozen(value)

  Object.keys(Object.freeze(object))
    |> map (key) -> object[key]
    |> filter is-frozen
    |> each deep-freeze
  object

sort-alphabetically = (a, b) ->
  if a < b
    -1
  else if a > b
    1
  else
    0

# If item path starts with 'vendor', it has bigger priority.
# TODO: check for config.vendor-path
sort-byVendor = (config, a, b) ->
  vendor = config.vendor-paths.slice().sort(sort-alphabetically)
  a-isVendor = vendor.some((path) -> exports.starts-with a, path)
  b-isVendor = vendor.some((path) -> exports.starts-with b, path)
  if a-isVendor and not b-isVendor
    -1
  else if not a-isVendor and b-isVendor
    1
  else
    # All conditions were false, we don't care about order of
    # these two items.
    sort-alphabetically a, b

# Items wasn't found in config.before, try to find then in
# config.after.
# Item that config.after contains would have lower sorting index.
sort-byAfter = (config, a, b) ->
  index-ofA = config.after.index-of a
  index-ofB = config.after.index-of b
  [hasA, hasB] = [(index-ofA isnt -1), (index-ofB isnt -1)]
  if hasA and not hasB
    1
  else if not hasA and hasB
    -1
  else if hasA and hasB
    index-ofA - index-ofB
  else
    sort-byVendor config, a, b

# Try to find items in config.before.
# Item that config.after contains would have bigger sorting index.
sort-byBefore = (config, a, b) ->
  index-ofA = config.before.index-of a
  index-ofB = config.before.index-of b
  [hasA, hasB] = [(index-ofA isnt -1), (index-ofB isnt -1)]
  if hasA and not hasB
    -1
  else if not hasA and hasB
    1
  else if hasA and hasB
    index-ofA - index-ofB
  else
    sort-byAfter config, a, b

# Sorts by pattern.
# 
# Examples
#
#   sort ['b.coffee', 'c.coffee', 'a.coffee'],
#     before: ['a.coffee'], after: ['b.coffee']
#   # ~> ['a.coffee', 'c.coffee', 'b.coffee']
# 
# Returns new sorted array.
exports.sort-byConfig = (files, config) ->
  if to-string.call(config) is '[object Object]'
    cfg =
      before: config.before ? [] 
      after: config.after ? []
      vendor-paths: config.vendor-paths ? []
    files.slice().sort (a, b) -> sort-byBefore cfg, a, b
  else
    files

exports.install = install = (root-path, callback = (->)) ->
  prev-dir = process.cwd()
  logger.info 'Installing packages...'
  process.chdir root-path
  # Install node packages.
  exec 'npm install', (error, stdout, stderr) ->
    process.chdir prev-dir
    return callback stderr.to-string() if error?
    callback null, stdout

start-default-server = (port, path, base, callback) ->
  server = express.create-server()
  server.use (request, response, next) ->
    response.header 'Cache-Control', 'no-cache'
    next()
  server.use base, express.static path
  server.all "#{base}/*", (request, response) ->
    response.sendfile sys-path.join path, 'index.html'
  server.listen parse-int port, 10
  server.on 'listening', callback
  server

exports.start-server = (config, callback = (->)) ->
  on-listening = ->
    logger.info "application started on http://localhost:#{config.server.port}/"
    callback()
  if config.server.path
    try
      server = require sys-path.resolve config.server.path
      server.start-server config.server.port, config.paths.public, on-listening
    catch error
      logger.error "couldn\'t load server #{config.server.path}: #{error}"
  else
    start-default-server config.server.port, config.paths.public, config.server.base, on-listening

exports.replace-slashes = replace-slashes = (config) ->
  change-path = (string) -> string.replace(/\//g, '\\')
  files = config.files or {}
  Object.keys(files).for-each (language) ->
    lang = files[language] or {}
    order = lang.order or {}

    # Modify order.
    Object.keys(order).for-each (order-key) ->
      lang.order[order-key] = lang.order[order-key].map(change-path)

    # Modify join configuration.
    switch to-string.call(lang.join-to)
      when '[object String]'
        lang.join-to = change-path lang.join-to
      when '[object Object]'
        new-join-to = {}
        Object.keys(lang.join-to).for-each (join-toKey) ->
          new-join-to[change-path join-toKey] = lang.join-to[join-toKey]
        lang.join-to = new-join-to
  config

exports.set-config-defaults = set-config-defaults = (config, config-path) ->
  join = (parent, name) ~>
    sys-path.join config.paths[parent], name

  if config.build-path?
    logger.warn 'config.build-path is deprecated. Use config.paths.public.'

  paths                = config.paths     ?= {}
  paths.root          ?= config.root-path  ? '.'
  paths.public        ?= config.build-path ? join 'root', 'public'
  paths.app           ?= join 'root', 'app'
  paths.config         = config-path       ? join 'root', 'config'
  paths.package-config ?= join 'root', 'package.json'
  paths.test          ?= join 'root', 'test'
  paths.vendor        ?= join 'root', 'vendor'
  paths.assets        ?= [join(paths.app, 'assets'), join(paths.test, 'assets')]
  paths.ignored       ?= (path) ->
    exports.starts-with(sys-path.basename(path), '_') or
    path in [paths.config, paths.package-config]
  config.server       ?= {}
  config.server.base  ?= ''
  config.server.port  ?= 3333
  config.server.run   ?= no
  # Alias deprecated config params.
  config.root-path      = config.paths.root
  config.build-path     = config.paths.public
  # Mangle types.
  config.paths.assets  = ensure-array config.paths.assets

  replace-slashes config if process.platform is 'win32'
  config

exports.load-config = (config-path = 'config.coffee', options = {}) ->
  require.extensions['.coffee'] ?= (module, filename) ->
    content = coffeescript.compile fs.read-file-sync filename, 'utf8', {filename}
    module._compile content, filename

  full-path = sys-path.resolve config-path
  delete require.cache[full-path]
  try
    {config} = require full-path
  catch error
    throw new Error("couldn\'t load config #{config-path}. #{error}")
  set-config-defaults config, full-path
  recursive-extend config, options
  deep-freeze config
  config

exports.load-plugins = (config, callback) ->
  root-path = sys-path.resolve config.root-path
  fs.read-file config.paths.package-config, (error, data) ->
    return callback error if error?
    deps = Object.keys(JSON.parse(data).dependencies)
    try
      plugins = deps
        .map (dependency) ->
          require "#{root-path}/node_modules/#{dependency}"
        .filter (plugin) ->
          (plugin::)? and plugin::brunch-plugin
        .map (plugin) ->
          new plugin config
    catch err
      error = err
    callback error, plugins
