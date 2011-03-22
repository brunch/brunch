var util = require('util');
var port = process.argv[2];

var express = require("express");
var app = express.createServer();

app.configure(function(){
    app.set('views', "brunch/build");
    app.use(express.static("brunch/build"));
});

app.get('/', function(req, res){
  res.render('index');
});

util.log("starting server on port " + port);
app.listen(parseInt(port, 10));
