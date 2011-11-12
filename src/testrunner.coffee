sys = require "sys"
fs = require "fs"
path = require "path"
coffee = require "coffee-script"
jsdom = require "jsdom"

helpers = require "./helpers"
{TerminalReporter} = require __dirname + "/../vendor/reporter"


# TODO: find a better way to do this.
# https://github.com/brunch/brunch/pull/111#issuecomment-2244266
TEMP = "/tmp/brunchtest"
SPECFILE = path.join TEMP, "specs.js"


exports.run = (options, callback) ->
  brunchdir = path.resolve options.appPath
  testdir = path.join brunchdir, "test"
  specs = []
  helpers.log "Running tests in #{testdir}"
  # Compiles specs in `dir` and appends the result to `specs`.
  getSpecFiles = (dir) ->
    for f in fs.readdirSync dir
      filepath = path.join dir, f
      ext = path.extname filepath
      if ext in [".coffee", ".js"]
        spec = fs.readFileSync filepath, "utf-8"
        spec = coffee.compile spec if ext is ".coffee"
        specs.push spec
      else if fs.statSync(filepath).isDirectory()
        getSpecFiles filepath

  getSpecFiles testdir
  # Remove temporary folder if it already exists
  try
    if fs.statSync("/tmp/brunchtest").isDirectory()
      for f in fs.readdirSync TEMP
        fs.unlinkSync path.join TEMP, f
      fs.rmdirSync TEMP

  fs.mkdir TEMP, 0755, ->
    # Write specs to temporary folder.
    fs.writeFileSync SPECFILE, specs.join "\n"
    # Run specs in fake browser.
    jsdom.env
      html: path.join brunchdir, "index.html"
      scripts: [
        path.resolve options.buildPath, "web/js/app.js"
        path.resolve __dirname, "../vendor/jasmine.js"
        SPECFILE
      ]
      done: (error, window) ->
        helpers.logError error if error?
        # If we're testing brunch itself, we don't need to view the output.
        # TODO: move this to TerminalReporter.
        stream = if global.jasmine then (->) else sys.print

        jasmineEnv = window.jasmine.getEnv()
        jasmineEnv.reporter = new TerminalReporter
          print: stream
          verbose: options.verbose
          color: yes
          onComplete: null
          stackFilter: null
          teamcity: options.teamcity
        jasmineEnv.execute()
        callback?()
