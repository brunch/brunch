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

# Handle error and kill the process.
onerror = (err) ->
  if err
    process.stdout.write "#{red}#{err.stack}#{reset}\n"
    process.exit -1

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
    log "Installing runtime dependencies into node_modules ...", green
    exec "npm bundle", onExec

    log "Installing development dependencies into node_modules ...", green
    for name, version of JSON.parse(package).devDependencies
      exec "npm bundle install \"#{name}@#{version}\"", onExec

task "install", "Install Brunch in your local repository", ->
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
  cmd = spawn("coffee", ["--compile", "--watch", "--lint", "--output", "lib", "src"])
  cmd.stdout.on "data", (data) -> process.stdout.write green + data + reset
  cmd.on "error", onerror


clean = (callback) ->
  exec "rm -rf lib", callback
task "clean", "Remove temporary files and such", -> clean onerror


## Testing ##

runTests = (callback) ->
  log "Running test suite ...", green
  exec "nodeunit test", (err, stdout, stderr) ->
    process.stdout.write stdout
    process.stderr.write stderr
    callback err if callback
task "test", "Run all tests", ->
  runTests (err) ->
    process.stdout.on "drain", -> process.exit -1 if err


## Publishing ##

task "publish", "Publish new version (Git, NPM, site)", ->
  # Run tests, don't publish unless tests pass.
  runTests (err) ->
    onerror err
    # Clean up temporary files and such, want to create everything from
    # scratch, don't want generated files we no longer use, etc.
    clean (err) ->
      onerror err
      exec "git push", (err) ->
        onerror err
        fs.readFile "package.json", "utf8", (err, package) ->
          package = JSON.parse(package)

          log "Publishing to NPM ...", green
          build (err) ->
            onerror err
            exec "npm publish", (err, stdout, stderr) ->
              log stdout, green
              onerror err

              # Create a tag for this version and push changes to Github.
              log "Tagging v#{package.version} ...", green
              exec "git tag v#{package.version}", (err, stdout, stderr) ->
                log stdout, green
                exec "git push --tags origin master", (err, stdout, stderr) ->
                  log stdout, green
