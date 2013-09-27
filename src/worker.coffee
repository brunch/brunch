'use strict'

cluster = require 'cluster'
sysPath = require 'path'
numCPUs = require('os').cpus().length
debug = require('debug')('brunch:worker')
pipeline = require './fs_utils/pipeline'

workers = undefined

# monkey-patch pipeline and override on master process
origPipeline = pipeline.pipeline
pipeline.pipeline = (args...) ->
  [path, linters, compilers, callback] = args
  exts = workers?.config?.extensions
  if workers and (not exts or sysPath.extname(path).slice(1) in exts)
    debug "Worker compilation of #{path}"
    workers.queue path, ([msg]) ->
      msg.compiled = msg.data
      callback msg.error, msg
  else
    origPipeline args...

# method invoked on worker processes
initWorker = ({changeFileList, compilers, linters, fileList}) ->
  fileList.on 'compiled', (path) ->
    process.send fileList.files.filter (_) -> _.path is path
  process
    .on 'message', (path) ->
      changeFileList compilers, linters, fileList, path
    .send 'ready'

# BrunchWorkers class invoked in the master process for wrangling all the workers
class BrunchWorkers
  constructor: (@config={}) ->
    counter = @count = @config.count or numCPUs - 1
    @workerIndex = @count - 1
    @jobs = []
    @list = []
    @fork @list, @work.bind this while counter--
  fork: (list, work) ->
    cluster.fork().on 'message', (msg) ->
      if msg is 'ready'
        @handlers = {}
        list.push this
        do work
      else if msg?[0]?.path
        @handlers[msg[0].path] msg
  queue: (path, handler) ->
    @jobs.push {path, handler}
    do @work
  work: ->
    activeWorkers = @list.length
    return unless activeWorkers
    if activeWorkers < @count
      @next activeWorkers - 1 if @jobs.length
    else
      while @jobs.length
        @next @workerIndex
        @workerIndex = 0 if ++@workerIndex is @count
  next: (index) ->
    {path, handler} = @jobs.shift()
    @list[index].handlers[path] = handler
    @list[index].send path

module.exports = ({changeFileList, compilers, linters, fileList, config}) ->
  if cluster.isWorker
    debug 'Worker started'
    initWorker {changeFileList, compilers, linters, fileList}
    undefined
  else
    workers = new BrunchWorkers config.workers

module.exports.isWorker = cluster.isWorker
module.exports.close = cluster.disconnect
