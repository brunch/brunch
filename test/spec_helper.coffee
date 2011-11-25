{spawn} = require 'child_process'


exports.removeDirectory = (destination, callback) ->
  rm = spawn 'rm', ['-R', destination]
  rm.stderr.on 'data', (data) ->
    console.log "Error on directory removal: #{data}"
  rm.on 'exit', (-> callback?())
