fs = require "fs"
stylus = require "stylus"

{Compiler} = require "./base"


try
  nib = require("nib")()
catch error
  null


class exports.StylusCompiler extends Compiler
  patterns: -> [/\.styl$/]

  compile: (files) ->
    mainFilePath = @getPath "src/app/styles/main.styl"

    fs.readFile mainFilePath, "utf8", (error, data) =>
      return @logError error if error?
      compiler = stylus(data)
        .set("filename", mainFilePath)
        .set("compress", true)
        .set("firebug", @options.stylus?.firebug)
        .include(@getPath "src")

      compiler.use nib if nib
      compiler.render (error, css) =>
        return @logError error if error?
        main = @getBuildPath "web/css/main.css"
        fs.writeFile main, css, "utf8", (error) =>
          return @logError error if error?
          @log()
