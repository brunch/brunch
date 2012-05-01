common = require './common'
helpers = require '../helpers'
SourceFileList = require './source_file_list'
watch = require './watch'
write = require './write'

module.exports = helpers.extend common, {write, SourceFileList, watch}
