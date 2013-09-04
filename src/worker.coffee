'use strict'

module.exports.initWorker = (compilers) ->
	process.on 'message', (path) ->
		console.log path
	process.send 'ready'
