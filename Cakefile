fs            = require("fs")
path          = require("path")
{spawn, exec} = require("child_process")
stdout        = process.stdout

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
  fs.readFile "package.json", "utf8", (err, package) ->
    install = (dependencies, callback) ->
      if dep = dependencies.shift()
        [name, version] = dep
        log "Installing #{name} #{version}", green
        exec "npm install \"#{name}@#{version}\"", (err) ->
          if err
            onerror err
          else
            install dependencies, callback
      else if callback
        callback()

    json = JSON.parse(package)
    log "Need runtime dependencies, installing into node_modules ...", green
    dependencies = []
    dependencies.push [name, version] for name, version of json.dependencies
    install dependencies, ->
      log "Need development dependencies, installing ...", green
      dependencies = []
      dependencies.push [name, version] for name, version of json.devDependencies
      install dependencies

task "install", "Install Brunch in your local npm repository", ->
  build ->
    log "Installing Brunch ...", green
    exec "npm install", onExec

## Building ##

build = (callback) ->
  log "Compiling CoffeeScript to JavaScript ...", green
  exec "rm -rf lib && coffee --compile --lint --output lib src", (error, stdout, stderr) ->
    onExec error, stdout, stderr
    callback() if callback?

task "build", "Compile CoffeeScript to JavaScript", ->
  build()

task "watch", "Continously compile CoffeeScript to JavaScript", ->
  command = spawn "coffee", ["--compile", "--watch", "--lint", "--output", "lib", "src"]
  command.stdout.on 'data', (data) ->
    process.stdout.write "#{green}#{data}#{reset}"
  command.stderr.on 'data', (data) ->
    process.stdout.write "#{red}#{data}#{reset}"
  command.on "error", (error) ->
    process.stdout.write "#{red}#{error.stack}#{reset}\n"
    process.exit -1

## Testing ##

task 'test', 'Run test suite', ->
  reporter = require('nodeunit').reporters.default
  reporter.run ['test']

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
