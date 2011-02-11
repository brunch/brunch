exec      = require('child_process').exec

exports.copy = (source, target) ->
  exec 'cp -R ' + source + ' ' + target, (error, stdout, stderr) ->
    console.log(stdout) if stdout
    console.log(stderr) if stderr
    console.log(error) if error
