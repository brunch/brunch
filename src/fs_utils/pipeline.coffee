each = require 'async-each'
waterfall = require 'async-waterfall'
debug = require('debug')('brunch:pipeline')
fs = require 'fs'
sysPath = require 'path'
logger = require 'loggy'

throwError = (type, stringOrError) =>
  string = if stringOrError instanceof Error
    stringOrError.toString().replace /^([^:]+:\s+)/, ''
  else
    stringOrError
  error = new Error string
  error.code = type
  error

# Run all linters.
lint = (data, path, linters, callback) ->
  if linters.length is 0
    callback null
  else
    each linters, (linter, callback) ->
      linter.lint data, path, callback
    , callback

# Extract files that depend on current file.
getDependencies = (data, path, compiler, callback) ->
  if compiler.getDependencies
    debug "getDependencies '#{path}' with '#{compiler.constructor.name}'"
    compiler.getDependencies data, path, callback
  else
    callback null, []

mapCompilerChain = (compiler) -> (params, next) ->
  return next() unless params
  {dependencies, compiled, source, sourceMap, path, callback} = params
  debug "Compiling '#{path}' with '#{compiler.constructor.name}'"

  compilerData = compiled or source
  compilerArgs = if compiler.compile.length is 2
    # New API: compile({data, path}, callback)
    [{data: compilerData, path, map: sourceMap}]
  else
    # Old API: compile(data, path, callback)
    [compilerData, path]

  compilerArgs.push (error, result) ->
    return callback throwError 'Compiling', error if error?
    return next() unless result?
    if toString.call(result) is '[object Object]'
      sourceMap = result.map if result.map?
      compiled = result.data
    else
      compiled = result
    unless compiled?
      throw new Error "Brunch SourceFile: file #{path} data is invalid"
    getDependencies source, path, compiler, (error, dependencies) =>
      return callback throwError 'Dependency parsing', error if error?
      next null, {dependencies, compiled, source, sourceMap, path, callback}

  compiler.compile.apply compiler, compilerArgs

compile = (source, path, compilers, callback) ->
  first = (next) -> next null, {source, path, callback}
  waterfall [first].concat(compilers.map mapCompilerChain), callback

pipeline = (path, linters, compilers, callback) ->
  debug "Reading '#{path}'"
  fs.readFile path, 'utf-8', (error, source) ->
    return callback throwError 'Reading', error if error?
    debug "Linting '#{path}'"
    lint source, path, linters, (error) ->
      if error?.toString().match /^warn\:\s/i
        logger.warn "Linting of #{path}: #{error}"
      else
        return callback throwError 'Linting', error if error?
      
      compile source, path, compilers, callback

exports.pipeline = pipeline
