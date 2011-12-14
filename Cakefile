fs = require 'fs'
path = require 'path'
{spawn, exec} = require 'child_process'


stdout = process.stdout

# Use executables installed with npm bundle.
process.env['PATH'] = "node_modules/.bin:#{process.env['PATH']}"

# ANSI Terminal Colors.
bold  = '\033[0;1m'
red   = '\033[0;31m'
green = '\033[0;32m'
reset = '\033[0m'

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

writeData = (data) ->
  process.stdout.write data.toString()

## Setup ##

task 'setup', 'Install development dependencies', ->
  log 'Installing dependencies into node_modules ...', green
  exec 'npm install', onExec

task 'link', 'Link local brunch as your global npm module', ->
  log 'Installing Brunch ...', green
  exec 'npm link', onExec

## Testing ##

task 'test', 'Run test (spec) suite', ->
  tester = spawn './node_modules/mocha/bin/mocha', [
    '--colors', '--require', 'should', '--reporter', 'spec'
  ]
  tester.stdout.on 'data', writeData
  tester.stderr.on 'data', writeData
  tester.on 'exit', process.exit


## Publishing ##

task 'publish', 'Publish new version to Git (push and add tag) and NPM', ->
  exec 'git push origin master', (error, stdout, stderr) ->
    onExec error, stdout, stderr
    fs.readFile 'package.json', (err, package) ->
      package = JSON.parse(package)

      log 'Publishing to NPM ...', green
      exec 'npm publish', (error, stdout, stderr) ->
        onExec error, stdout, stderr

        # Create a tag for this version and push changes to Github.
        log "Tagging version #{package.version} ...", green
        exec "git tag #{package.version}", (error, stdout, stderr) ->
          onExec error, stdout, stderr
          exec 'git push --tags origin master', onExec
