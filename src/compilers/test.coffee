exec = require('child_process').exec
path = require('path')
coffee = require('coffee-script')
jasmine = require('jasmine-node')

Compiler = require('./base').Compiler

class exports.TestCompiler extends Compiler

  filePattern : ->
    [/\.coffee$/, /src\/.*\.js$/, new RegExp("#{@options.templateExtension}$")]

  compile: (files) ->
    srcdir  = path.resolve(@options.brunchPath, 'src')
    testdir = path.resolve(@options.brunchPath, 'test')
    exec "coffee -c -o #{testdir} #{srcdir}", (error, stdout, stderr) =>
      if error
        console.log('Error: TestCompiler could not compile source')
        console.log(stdout.toString().trim())
        console.log(stderr.toString().trim())
      else
        console.log('Running tests in ' + testdir)
        jasmine.executeSpecsInFolder(testdir, undefined, false, true, /.spec\.(js|coffee)$/i)
