roy = require 'roy'

# Example
# 
#   capitalize 'test'
#   # => 'Test'
#
capitalize = (string) ->
  (string[0] or '').toUpperCase() + string[1..]

# Example
# 
#   formatClassName 'twitter_users'
#   # => 'TwitterUsers'
#
formatClassName = (filename) ->
  filename.split('_').map(capitalize).join('')

module.exports = class RoyCompiler
  brunchPlugin: yes
  type: 'javascript'
  extension: 'roy'
  generators:
    backbone: do ->
      types = {}
      ['collection', 'model', 'router', 'view'].forEach (type) ->
        parent = formatClassName type
        types[type] = (fileName) ->
          className = formatClassName fileName
          # This is temporary, until roy'll release module system.
          ''
      types

  constructor: (@config) ->
    null

  compile: (data, path, callback) ->
    try
      result = (roy.compile data).output
    catch err
      error = err
    finally
      callback error, result
