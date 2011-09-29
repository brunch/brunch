sys = require('sys')
fs = require('fs')
path = require('path')
coffee = require('coffee-script')
jsdom = require('jsdom')

TerminalReporter = require(__dirname + '/../vendor/reporter').TerminalReporter

exports.run = (options) ->
  brunchdir = path.resolve(options.brunchPath)
  testdir = path.join(brunchdir, 'test')
  jasmine = path.resolve(__dirname, '../vendor/jasmine.js')
  console.log('Running tests in ' + testdir)
  scripts = [
    path.join(brunchdir, 'build/web/js/app.js')
    jasmine
  ]
  fs.rmdir '/tmp/brunchtest', ->
    fs.mkdir '/tmp/brunchtest', '0755', ->
      counter = 0
      # Compiles specs in `dir` to `/tmp/brunchtest/` and appends their path to `scripts`
      getSpecFiles = (dir, list) ->
        for f in fs.readdirSync(dir)
          filepath = path.join(dir, f)
          ext = path.extname(filepath)
          if ext == '.coffee' or ext == '.js'
            outpath = "/tmp/brunchtest/#{counter}.js"
            spec = fs.readFileSync(filepath, 'utf-8')
            if ext == '.coffee'
              spec = coffee.compile(spec)
            fs.writeFileSync(outpath, spec)
            list.push(outpath)
            counter += 1
          else if fs.statSync(filepath).isDirectory()
            getSpecFiles(filepath, list)

      getSpecFiles(testdir, scripts)

      jsdom.env
        html: path.join(brunchdir, 'index.html')
        scripts: scripts
        done: (errors, window) ->
          jasmineEnv = window.jasmine.getEnv()
          jasmineEnv.reporter = new TerminalReporter
            print:       sys.print
            verbose:     false
            color:       true
            onComplete:  null
            stackFilter: null

          jasmineEnv.execute()

