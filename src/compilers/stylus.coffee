fs = require "fs"
stylus = require "stylus"

helpers = require "../helpers"
{Compiler} = require "./base"


try
  nib = require("nib")()
catch error
  null


class exports.StylusCompiler extends Compiler
  filePattern: -> [/\.styl$/]

  compile: (files) ->
    mainFilePath = @getPath "src/app/styles/main.styl"

    fs.readFile mainFilePath, "utf8", (error, data) =>
      if error?
        helpers.logError "[Stylus]: error. #{error}"
      else
        compiler = stylus(data)
          .set("filename", mainFilePath)
          .set("compress", true)
          .include(@getPath "src")

        compiler.use nib if nib
        compiler.render (error, css) =>
          if error?
            helpers.logError "[Stylus]: error. #{error}"
          else
            main = @getBuildPath("web/css/main.css")
            fs.writeFile main, css, "utf8", (error) =>
              if error?
                helpers.logError "[Stylus]: error. #{error}"
              else
                helpers.logSuccess "[Stylus]: compiled main.css"
