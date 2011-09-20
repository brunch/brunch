fs = require "fs"
stylus = require "stylus"

brunch = require "../brunch"
{Compiler} = require "./base"

try
  nib = require("nib")()
catch error
  null

class exports.StylusCompiler extends Compiler
  compile: (files) ->
    mainFilePath = @generatePath "src/app/styles/main.styl"

    fs.readFile mainFilePath, "utf8", (error, data) =>
      return @logError error if error?
      compiler = stylus(data)
        .set("filename", mainFilePath)
        .set("compress", true)
        .include(@generatePath "src")

      compiler.use nib if nib
      compiler.render (error, css) =>
        return @logError error if error?
        @writeToFile @options.output, css, (error) =>
          return @logError error if error?
          @log()
