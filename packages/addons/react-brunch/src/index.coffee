react = require 'react-tools/main'
babel = require 'babel-core'
omit  = require 'lodash.omit'

module.exports = class ReactCompiler
  brunchPlugin: yes
  type: 'javascript'
  extension: 'jsx'
  pattern: /\.jsx/

  constructor: (@config) ->
    options = @config?.plugins?.react || {}
    for key in Object.keys(options)
      unless key in ['babel', 'transformOptions']
        console.warn "Warning: react-brunch requires to set option keys in `transformOptions`. See: http://goo.gl/Whn9z6"
        break

    @babel = options.babel is yes
    @options = options.transformOptions || options || {}
    @options = omit(@options, 'babel') if @options.babel

  compile: (params, callback) ->
    source= params.data

    try
      if @babel
        output = babel.transform(source, @options)
      else
        output = react.transformWithDetails(source, @options)

    catch err
      console.log "ERROR", err
      console.dir(output)
      return callback err.toString()

    callback null, data: output.code
