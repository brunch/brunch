require.paths.unshift __dirname + "/../src"

command = require('command')

module.exports =
  'load options from arguments': (test) ->
    test.expect 4

    opts =
      '1': 'client'
      templateExtension: 'haml'
      projectTemplate: 'base'
      expressPort: '80'

    options = command.loadOptionsFromArguments opts, {}
    test.strictEqual options.projectTemplate, 'base', 'options should include given projectTemplate'
    test.strictEqual options.templateExtension, 'haml', 'options should include given templateExtension'
    test.strictEqual options.brunchPath, 'client', 'options should include given brunch path'
    test.strictEqual options.expressPort, '80', 'options should include given express port'
    test.done()
