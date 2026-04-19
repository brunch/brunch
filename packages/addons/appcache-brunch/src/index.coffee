crypto  = require 'crypto'
fs      = require 'fs'
pathlib = require 'path'


class Walker
  constructor: ->
    @todo = {}
    @walking = false

  add: (path) ->
    @todo[path] = 1
    @walking = true

  del: (path) ->
    delete @todo[path]
    @walking = Object.keys(@todo).length > 0

  readdir: (path, callback) ->
    @add path
    fs.readdir path, (err, filenames) =>
      throw err if err?
      @del path
      callback filenames

  stat: (path, callback) ->
    @add path
    fs.stat path, (err, stats) =>
      throw err if err?
      @del path
      callback stats

  walk: (path, callback) ->
    @readdir path, (filenames) =>
      filenames.forEach (filename) =>
        filePath = pathlib.join path, filename
        @stat filePath, (stats) =>
          if stats.isDirectory()
            @walk filePath, callback
          else
            callback filePath


class Manifest
  constructor: (@config) ->

    if 'appcache' of @config
      console.warn 'Warning: config.appcache is deprecated, please move it to config.plugins.appcache'

    # Defaults options
    @options = {
      ignore: /[\\/][.]/
      externalCacheEntries: []
      network: ['*']
      fallback: {}
      staticRoot: '.'
      manifestFile: 'appcache.appcache'
    }

    # Merge config
    cfg = @config.plugins?.appcache ? @config.appcache ? {}
    @options[k] = cfg[k] for k of cfg

  brunchPlugin: true

  onCompile: ->
    paths = []
    walker = new Walker
    walker.walk @config.paths.public, (path) =>
      paths.push path unless /[.]appcache$/.test(path) or @options.ignore.test(path)
      unless walker.walking
        shasums = []
        paths.sort()
        paths.forEach (path) =>
          shasum = crypto.createHash 'sha1'
          s = fs.ReadStream path
          s.on 'data', (data) => shasum.update data
          s.on 'end', =>
            shasums.push shasum.digest 'hex'
            if shasums.length is paths.length
              shasum = crypto.createHash 'sha1'
              shasum.update shasums.sort().join(), 'ascii'
              @write((pathlib.relative @config.paths.public, p for p in paths).replace /\\/g '/',
                     shasum.digest 'hex')

  format = (obj) ->
    ("#{k} #{obj[k]}" for k in Object.keys(obj).sort()).join('\n')

  write: (paths, shasum) ->
    fs.writeFileSync pathlib.join(@config.paths.public, @options.manifestFile),
    """
      CACHE MANIFEST
      # #{shasum}

      NETWORK:
      #{@options.network.join('\n')}

      FALLBACK:
      #{format @options.fallback}

      CACHE:
      #{("#{@options.staticRoot}/#{p}" for p in paths).join('\n')}
      #{@options.externalCacheEntries.join('\n')}
    """


module.exports = Manifest
