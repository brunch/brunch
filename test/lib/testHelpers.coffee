spawn   = require('child_process').spawn

exports.removeDirectory = (destination, callback) ->
  rm = spawn 'rm', ['-R', destination]

  rm.stderr.on 'data', (data) ->
    console.log "stderr: #{data}"

  rm.on 'exit', (code) ->
    callback() if typeof(callback) is 'function'
