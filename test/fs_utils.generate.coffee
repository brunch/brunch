generate = require '../src/fs_utils/generate'

describe 'generate', ->
  describe 'sortByConfig()', ->
    it 'should files by config.before', ->
      files = ['backbone.js', 'jquery.js', 'underscore.js']
      config =
        before: ['jquery.js', 'underscore.js', 'backbone.js']
      expect(generate.sortByConfig files, config).to.eql config.before

    it 'should files by config.after', ->
      files = ['helper-1.js', 'backbone.js', 'helper-2.js']
      config =
        after: ['helper-1.js', 'helper-2.js']
      expect(generate.sortByConfig files, config).to.eql [
        'backbone.js', 'helper-1.js', 'helper-2.js'
      ]

    it 'should files by config.vendor', ->
      files = ['vendor/backbone.js', 'jquery.js', 'meh/underscore.js']
      config =
        vendorConvention: (path) -> /^(meh|vendor)/.test(path)
      expect(generate.sortByConfig files, config).to.eql [
        'meh/underscore.js', 'vendor/backbone.js', 'jquery.js'
      ]

    it 'should files alphabetically', ->
      files = ['z', 'e', 'a', 'd', 'c', 's', 'z']
      config = {}
      expect(generate.sortByConfig files, config).to.eql [
        'a', 'c', 'd', 'e', 's', 'z', 'z'
      ]

    it 'should sort files by config correctly', ->
      files = [
        'a',
        'b',
        'c',
        'vendor/5',
        'vendor/4',
        'd',
        'vendor/1',
        'vendor/3',
        'vendor/6',
        'e',
        'vendor/2'
      ]

      config =
        before: ['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5']
        after: ['b']
        vendorConvention: (path) -> /vendor\//.test(path)

      expect(generate.sortByConfig files, config).to.eql [
        'vendor/1',
        'vendor/2',
        'vendor/3',
        'vendor/4',
        'vendor/5',
        'vendor/6',
        'a',
        'c',
        'd',
        'e',
        'b'
      ]
