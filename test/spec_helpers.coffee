util = require 'util'
path = require 'path'
express = require 'express'
{spawn} = require 'child_process'

exports.runServer = (appPath, callback = (->)) ->
  app = express.createServer()
  app.configure ->
    app.use express.static appPath
    app.set 'views', appPath
    app.set 'view options', layout: no
    app.register '.html', require 'eco'

  app.get '/', (req, res) -> res.render 'index.html'
  app.listen 8080
  app.on 'listening', ->
    callback()
  app

exports.logJSON = (object) ->
  console.log JSON.stringify object, null, 2
