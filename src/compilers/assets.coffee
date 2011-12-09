path = require 'path'

helpers = require '../helpers'
{CopyingCompiler} = require './base'


class exports.AssetsCompiler extends CopyingCompiler
  patterns: [/app\/assets\//]
  sourceDirectory: path.join 'app', 'assets'
