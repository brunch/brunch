util = require 'util'
path = require 'path'
express = require 'express'
{spawn} = require 'child_process'


exports.removeDirectory = (destination, callback) ->
  rm = spawn 'rm', ['-R', destination]
  rm.stderr.on 'data', (data) ->
    console.log "Error on directory removal: #{data}"
  rm.on 'exit', (-> callback?())


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

exports.runServer 'brunch/build'