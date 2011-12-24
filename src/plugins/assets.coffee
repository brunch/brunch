path = require 'path'
helpers = require '../helpers'
{BasePlugin} = require './base'


class exports.AssetsPlugin extends BasePlugin
  compile: (callback) ->
    sourceDirectory = path.resolve @getRootPath 'app', 'assets'
    async.forEach files, (source, next) =>
      destination = @getBuildPath path.resolve(source).replace sourceDirectory, ''
      copy = =>
        helpers.copyFile source, destination, next
      destinationDirectory = path.dirname destination
      fs.stat destinationDirectory, (error, stats) =>
        if error?
          process.nextTick =>
            try
              # TODO: fileUtil.mkdirs doesn't work properly.
              fileUtil.mkdirsSync path.resolve(destinationDirectory), 0755
              copy()
            catch error
              return
        else
          copy()
    , callback
