var express, path, spawn, util;

util = require('util');

path = require('path');

express = require('express');

spawn = require('child_process').spawn;

exports.runServer = function(appPath, callback) {
  var app;
  if (callback == null) {
    callback = (function() {});
  }
  app = express.createServer();
  app.configure(function() {
    app.use(express['static'](appPath));
    app.set('views', appPath);
    app.set('view options', {
      layout: false
    });
    return app.register('.html', require('eco'));
  });
  app.get('/', function(req, res) {
    return res.render('index.html');
  });
  app.listen(8080);
  app.on('listening', function() {
    return callback();
  });
  return app;
};

exports.logJSON = function(object) {
  return console.log(JSON.stringify(object, null, 2));
};
