{spawn} = require "child_process"


exports.removeDirectory = (destination, callback) ->
  rm = spawn "rm", ["-R", destination]
  rm.stderr.on "data", (data) -> console.log "stderr: #{data}" 
  rm.on "exit", (-> callback() if typeof(callback) is "function")
