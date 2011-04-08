require.paths.unshift __dirname + "/../src"

command = require('command')

module.exports =
  'load options from arguments': (test) ->
    test.expect 2

    options = command.loadOptionsFromArguments {templateExtension: 'a', projectTemplate: 'b'}, {}
    test.strictEqual(options.projectTemplate, 'b', 'options should include given projectTemplate')
    test.strictEqual(options.templateExtension, 'a', 'options should include given templateExtension')
    test.done()
