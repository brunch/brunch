require.paths.unshift __dirname + "/../lib"

command = require('../lib/command')

# TODO add tests for run

exports.commandLine =
  'load options from arguments': (test) ->
    test.expect 5

    opts =
      '1': 'client'
      templateExtension: 'haml'
      projectTemplate: 'base'
      expressPort: '80'
      buildPath: 'app/build'

    options = command.loadOptionsFromArguments opts, {}
    test.strictEqual options.projectTemplate, 'base', 'options should include given projectTemplate'
    test.strictEqual options.templateExtension, 'haml', 'options should include given templateExtension'
    test.strictEqual options.brunchPath, 'client', 'options should include given brunch path'
    test.strictEqual options.expressPort, '80', 'options should include given express port'
    test.strictEqual options.buildPath, 'app/build', 'options should include given build path'
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
    test.expect 4

    options = command.loadDefaultArguments()
    test.strictEqual options.projectTemplate, 'express', 'default projectTemplate should be express'
    test.strictEqual options.templateExtension, 'eco', 'default templateExtension should be eco'
    test.strictEqual options.brunchPath, 'brunch', 'default brunchPath should be brunch'
    test.strictEqual options.expressPort, '8080', 'default expressPort should be 8080'
    test.done()

  'load options from config file': (test) ->
    test.expect 2

    options = command.loadConfigFile('test/fixtures/base/config.yaml')
    test.deepEqual options.dependencies, ['ConsoleDummy.js'], 'should load list of dependencies'
    test.strictEqual options.buildPath, 'public/app', 'should load buildPath'
    test.done()
