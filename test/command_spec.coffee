require.paths.unshift __dirname + "/../src"

command = require "../src/command"

# TODO add tests for run
###
exports.commandLine =
  'load options from arguments': (test) ->
    test.expect 4

    opts =
      '1': 'client'
      templateExtension: 'haml'
      output: 'app/build'
      minify: true

    options = command.loadOptionsFromArguments opts, {}
    test.strictEqual options.templateExtension, 'haml', 'options should include given templateExtension'
    test.strictEqual options.brunchPath, 'client', 'options should include given brunch path'
    test.strictEqual options.buildPath, 'app/build', 'options should include given build path'
    test.strictEqual options.minify, true, 'options should include true minify'
    test.done()

  'generate correct build path': (test) ->
    test.expect 2

    opts =
      '1': 'client'
    options = command.loadOptionsFromArguments opts, {}
    test.strictEqual options.buildPath, 'client/build', 'options should contain brunch path + build if build path is not provided'

    opts =
      '1': 'client'
    options = command.loadOptionsFromArguments opts, { buildPath: 'output' }
    test.strictEqual options.buildPath, 'output', 'buildPath shouldn\'t be overwritten'

    test.done()

  'load default options': (test) ->
    test.expect 3

    options = command.loadDefaultArguments()
    test.strictEqual options.templateExtension, 'eco', 'default templateExtension should be eco'
    test.strictEqual options.brunchPath, 'brunch', 'default brunchPath should be brunch'
    test.strictEqual options.minify, false, 'default minify option should be false'
    test.done()

  'load options from config file': (test) ->
    test.expect 2

    options = command.loadConfigFile('spec/fixtures/base/config.yaml')
    test.deepEqual options.dependencies, ['ConsoleDummy.js'], 'should load list of dependencies'
    test.strictEqual options.buildPath, 'public/app', 'should load buildPath'
    test.done()
###