nib = require 'nib'
stylus = require 'stylus'
{BaseLanguage} = require './base'

class exports.StylusLanguage extends BaseLanguage
  compile: (path, callback) ->
    @readFile path, (error, data) =>
      return callback error if error?
      compiler = stylus(data)
        .set('compress', yes)
        .set('firebug', !!@config.stylus?.firebug)
        .include(@getRootPath 'app', 'styles')
        .use(nib())
        .render(callback)
