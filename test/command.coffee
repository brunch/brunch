require.paths.unshift __dirname + "/../lib"

command = require('command')

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
    test.expect 1

    opts =
      '1': 'client'

    options = command.loadOptionsFromArguments opts, {}
    test.strictEqual options.buildPath, 'client/build', 'options should contain brunch path + build if build path is not provided'
    test.done()
  'load default options': (test) ->
    test.expect 5

    options = command.loadDefaultArguments()
    test.strictEqual options.projectTemplate, 'express', 'default projectTemplate should be express'
    test.strictEqual options.templateExtension, 'eco', 'default templateExtension should be eco'
    test.strictEqual options.brunchPath, 'brunch', 'default brunchPath should be brunch'
    test.strictEqual options.expressPort, '8080', 'default expressPort should be 8080'
    test.strictEqual options.buildPath, 'brunch/build', 'default buildPath should be brunch/build'
    test.done()
