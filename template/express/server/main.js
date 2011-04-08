var util = require('util');
var path = require('path');
var port = process.argv[2];

var express = require("express");
var app = express.createServer();

var buildPath = path.join(process.argv[3], 'build');

app.configure(function(){
    app.set('views', buildPath);
    app.use(express.static(buildPath));
});

app.get('/', function(req, res){
  res.render('index');
});

util.log("starting server on port " + port);
app.listen(parseInt(port, 10));
