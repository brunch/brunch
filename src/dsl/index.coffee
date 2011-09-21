conf = require "coffee-conf"

helpers = require "../helpers"
{PathMatcher} = require "./path_matcher"
{YamlConfig} = require "./yaml_config"

class DSL extends conf.Config
  constructor: ->
    @_buildPath = "build"
    @matchers = []
    context = {}
    locals = {
      files: => @files.apply @, arguments
      buildPath: => @buildPath.apply @, arguments
    }

    super(locals, context)

  files: (paths...) ->
    matcher = new PathMatcher(@, paths)
    @matchers.push matcher
    matcher

  run: (code) ->
    super(code)
    options = {}
    for matcher in @matchers
      next unless matcher.name?
      options[matcher.name] = matcher.options
    options

  buildPath: (path) ->
    @_buildPath = path
    @

dsl = new DSL

exports.matchers = dsl.matchers

exports.run = -> dsl.run.apply dsl, arguments
exports.loadConfigFile = -> dsl.runFile.apply dsl, arguments

exports.loadYamlConfigFile = (path) ->
  helpers.logError "Old yaml based config file found! Please switch to new coffee-script based configuration!"
  yaml = new YamlConfig(path)
  yaml.toOptions()
