common = require './common'
FileWriter = require './file_writer'
helpers = require '../helpers'
SourceFileList = require './source_file_list'
spectate = require './spectate'

classes = {FileWriter, SourceFileList, spectate}
module.exports = helpers.extend common, classes
