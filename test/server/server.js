var util = require('util');
var path = require('path');
var port = process.argv[2];
var brunchPath = process.argv[3];

var express = require("express");
var app = express.createServer();

app.configure(function(){
    app.use(express.static(brunchPath));
    // setup views to render index.html
    app.set('views', brunchPath);
    app.set('view options', { layout: false });
    app.register('.html', require('eco'));
});

app.get('/', function(req, res){
  res.render('index.html');
});

app.listen(parseInt(port, 10));
