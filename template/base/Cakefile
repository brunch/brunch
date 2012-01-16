{spawn} = require 'child_process'
{EventEmitter} = require 'events'
fs = require 'fs'
{join} = require 'path'
{log, error} = require 'util'

pathes = do ->
  root = 'test'
  functional = join root, 'functional'
  unit = join root, 'unit'

  {
    root, functional, unit,
    collection: (join unit, 'collections'), model: (join unit, 'models'),
    router: (join unit, 'routers'), view: (join unit, 'views')
  }

runMocha = (target) ->
  log 'Test started'
  command = 'node' + path.join __dirname, 'node_modules', '.bin', 'mocha'
  options = '-r should --growl --reporter spec'
  args = "#{options} #{target}".trimRight().split(' ')
  spawn "#{command}", args, customFds: [0, 1, 2]

expandPath = (target, callback) ->
  fs.readdir target, (error, files) ->
    return callback "Files aren't found. path:'#{target}'" unless files    
    expansion = ''
    files
      .map (file) ->
        join target, file
      .forEach (file) ->
        expansion += file + ' '
    callback null, expansion

task 'test', (options) ->
  emitter = new EventEmitter
  emitter.once 'expanded', (paths) ->
    runMocha paths
  target = ''
  pathEmitter = new EventEmitter
  count = 0
  pathEmitter.on 'finished', (paths) ->
    count += 1
    emitter.emit 'expanded', paths if testPaths.length is count
  testPaths.forEach (testPath) ->
    expandPath testPath, (result) ->
      target += result
      pathEmitter.emit 'finished', target

['collections', 'models', 'routes', 'views'].forEach (type) ->
  task "test:unit:#{type}", (options) ->
    expandPath pathes["#{type}s"], (error, target) ->
      runMocha target
