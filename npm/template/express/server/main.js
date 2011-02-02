var express = require("express");
var app = express.createServer();

app.configure(function(){
    app.set('views', "brunch/build");
    app.use(express.staticProvider("brunch/build"));
});

app.get('/', function(req, res){
  res.render('index');
});

console.log("starting server on port 8080");
app.listen(8080);
