'use strict'


module.exports.initWorker = ({changeFileList, compilers, linters, fileList}) ->
	process
	.on 'message', (path) ->
		pathFilter =
		fileList.once "compiled #{path}", ->
			process.send fileList.files.filter (_) -> _.path is path
		changeFileList compilers, linters, fileList, path
	.send 'ready'
