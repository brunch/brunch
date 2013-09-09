'use strict'

cluster = require 'cluster'
pipeline = require './fs_utils/pipeline'

workers = undefined

# monkey-patch pipeline and override on master process
origPipeline = pipeline.pipeline
pipeline.pipeline = (args...) ->
  if workers?.active
    [path, linters, compilers, callback] = args
    messageHandler = ([msg]) ->
      return unless msg.path is path
      this.removeListener 'message', messageHandler
      msg.compiled = msg.data
      callback msg.error, msg
    workers.list[0].on('message', messageHandler).send(path)
  else
    origPipeline args...

# method invoked on worker processes
initWorker = ({changeFileList, compilers, linters, fileList}) ->
	process
	.on 'message', (path) ->
		pathFilter =
		fileList.once "compiled #{path}", ->
			process.send fileList.files.filter (_) -> _.path is path
		changeFileList compilers, linters, fileList, path
	.send 'ready'

# BrunchWorkers class invoked in the master process for wrangling all the workers
class BrunchWorkers
	constructor: ->
    @list = []
    workers = this
    cluster.fork().once 'message', (msg) ->
      workers.list.push this if msg is 'ready'
      workers.active = true

module.exports = ({changeFileList, compilers, linters, fileList}) ->
	if cluster.isWorker
    initWorker {changeFileList, compilers, linters, fileList}
    undefined
  else
    new BrunchWorkers

module.exports.isWorker = cluster.isWorker
