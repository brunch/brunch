{spawn} = require 'child_process'
{BaseLanguage} = require './base'

class exports.SassLanguage extends BaseLanguage
  constructor: ->
    super
    @process = spawn 'sass'

  compile: (path, callback) ->
    @readFile path, (error, data) =>
      return callback error if error?
      result = ''
      error = null
      # Warning: spawning child processes is a quite slow operation.
      # On my machine, it's ~200ms, when compiling stylus via node.js
      # without spawning child process is ~20ms.
      options = [
        '--stdin',
        '--load-path', (@getRootPath 'app', 'styles'),
        '--no-cache',
      ]
      options.push '--scss' if /\.scss$/.test path
      sass = spawn 'sass', options
      sass.stdin.end data
      sass.stdout.on 'data', (data) -> result = data
      sass.stderr.on 'data', (data) -> error = data
      sass.on 'exit', (code) -> callback error, result.toString()
