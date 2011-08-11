exec = require('child_process').exec

Compiler = require('./base').Compiler

class exports.TestCompiler extends Compiler

  filePattern : ->
    [/\.coffee$/, /src\/.*\.js$/, new RegExp("#{@options.templateExtension}$")]

  compile: (files) ->
    exec 'coffee -c -o test src', (error, stdout, stderr) ->
      if error
        console.log('Error: TestCompiler could not compile source')
        console.log(stdout.toString().trim())
        console.log(stderr.toString().trim())
      else
        console.log('Testing...')
        exec 'jasmine-node --coffee test', (error, stdout, stderr) ->
          if error
            console.log(stdout.toString().trim())
          else
            console.log(stdout.toString().trim())
