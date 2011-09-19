fs = require "fs"
path = require "path"
{spawn, exec} = require "child_process"


stdout = process.stdout

# Use executables installed with npm bundle.
process.env["PATH"] = "node_modules/.bin:#{process.env["PATH"]}"

# ANSI Terminal Colors.
bold  = "\033[0;1m"
red   = "\033[0;31m"
green = "\033[0;32m"
reset = "\033[0m"

# Log a message with a color.
log = (message, color, explanation) ->
  console.log "#{color}#{message}#{reset} #{(explanation or '')}"

# default handler for exec commands
onExec = (error, stdout, stderr) ->
  console.log stdout if stdout
  console.log stderr if stderr
  # print the error message and kill the process
  if error
    process.stdout.write "#{red}#{error.stack}#{reset}\n"
    process.exit -1

## Setup ##

task "setup", "Install development dependencies", ->
  log "Installing dependencies into node_modules ...", green
  exec "npm install", onExec

task "link", "Link local brunch as your global npm module", ->
  log "Installing Brunch ...", green
  exec "npm link", onExec

## Building ##

build = (callback) ->
  log "Compiling CoffeeScript to JavaScript ...", green
  command = "rm -rf lib && coffee --compile --lint --output lib src"
  exec command, (error, stdout, stderr) ->
    onExec error, stdout, stderr
    callback() if callback?

task "build", "Compile CoffeeScript to JavaScript", ->
  build()

task "watch", "Continously compile CoffeeScript to JavaScript", ->
  command = spawn "coffee", ["--compile", "--watch", "--lint", "--output", "lib", "src"]
  command.stdout.on "data", (data) ->
    process.stdout.write "#{green}#{data}#{reset}"
  command.stderr.on "data", (data) ->
    process.stdout.write "#{red}#{data}#{reset}"
  command.on "error", (error) ->
    process.stdout.write "#{red}#{error.stack}#{reset}\n"
    process.exit -1

## Testing ##

task "test", "Run test (spec) suite", ->
  sys = require "sys"
  {loadHelpersInFolder, executeSpecsInFolder} = require "jasmine-node"

  re =
    helper: /[-_]helper\.coffee$/
    spec: /spec\.coffee$/i
  specFolder = path.join __dirname, "spec"
  callback = (runner, log) -> sys.print "\n"

  loadHelpersInFolder specFolder, re.helper
  executeSpecsInFolder specFolder, callback, false, true, re.spec, false


## Publishing ##

task "publish", "Publish new version to Git (push and add tag) and NPM", ->
  exec "git push origin master", (error, stdout, stderr) ->
    onExec error, stdout, stderr
    fs.readFile "package.json", "utf8", (err, package) ->
      package = JSON.parse(package)

      log "Publishing to NPM ...", green
      exec "npm publish", (error, stdout, stderr) ->
        onExec error, stdout, stderr

        # Create a tag for this version and push changes to Github.
        log "Tagging version #{package.version} ...", green
        exec "git tag #{package.version}", (error, stdout, stderr) ->
          onExec error, stdout, stderr
          exec "git push --tags origin master", onExec
