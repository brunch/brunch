fs = require "fs"
stylus = require "stylus"

{Compiler} = require "./base"


try
  nib = require("nib")()
catch error
  null


class exports.StylusCompiler extends Compiler
  patterns: -> [/\.styl$/]

  compile: (files, callback) ->
    mainFilePath = @getAppPath "src/app/styles/main.styl"
    imagePath = @getAppPath (@options.stylus?.imagePath or "build/web/images")

    fs.readFile mainFilePath, "utf8", (error, data) =>
      return @logError error if error?
      compiler = stylus(data)
        .set("filename", mainFilePath)
        .set("compress", true)
        .set("paths", [imagePath])
        .set("firebug", @options.stylus?.firebug)
        .define("image-url", stylus.url({ limit: 0 }))
        .include(@getAppPath "src")

      compiler.use nib if nib
      compiler.render (error, css) =>
        return @logError error if error?
        main = @getBuildPath "web/css/main.css"
        fs.writeFile main, css, "utf8", (error) =>
          return @logError error if error?
          @log()
          callback @getClassName()
