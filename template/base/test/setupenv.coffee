sys = require('sys')
jsdom = require('jsdom')

module.exports =
  ready: (callback) ->
    process.chdir(__dirname + '/../')
    document = jsdom.env
      html: './index.html'
      scripts: ['./build/web/js/app.js']
      done: (errors, window) ->
        callback.call(window)
        jasmineEnv = jasmine.getEnv()
        jasmineEnv.reporter = new TerminalReporter
          print:       sys.print
          verbose:     false
          color:       true
          onComplete:  null
          stackFilter: null

        jasmineEnv.execute()
