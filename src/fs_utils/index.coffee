FileWatcher = require './file_watcher'
FileWriter = require './file_writer'
SourceFileList = require './source_file_list'
common = require './common'
helpers = require '../helpers'

classes = {FileWriter, FileWatcher, SourceFileList}
module.exports = helpers.extend common, classes
