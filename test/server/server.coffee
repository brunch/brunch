util = require 'util'
path = require 'path'
express = require 'express'


port = process.argv[2]
brunchPath = process.argv[3]
app = express.createServer()
app.configure ->
  app.use express.static brunchPath
  app.set 'views', brunchPath
  app.set 'view options', layout: false
  app.register '.html', require 'eco'


app.get '/', (req, res) -> res.render 'index.html'
app.listen parseInt port, 10
