fs = require 'fs'
expect = require('chai').expect
nunjucks = require 'nunjucks'
Plugin = require '../'
compiledFolder = __dirname + '/../public/tests'

describe 'Plugin', ->
  @plugin

  beforeEach ->
    @plugin = new Plugin
      plugins:
        nunjucks:
          test_variable: 'success'

  it 'should be an object', ->
    expect(@plugin).to.be.ok

  it 'should have #compile method', ->
    expect(@plugin.compile).to.be.an.instanceof(Function)

  it 'should pass `plugins.nunjucks` data to the template', (done) ->
    content = __dirname + '/variable_before.html'
    expected = fs.readFileSync __dirname + '/variable_after.html', { encoding: 'utf-8' }

    @plugin.compile '', content, (err) ->
      expect(err).not.to.be.ok
      result = fs.readFileSync compiledFolder + '/variable_before.html', { encoding: 'utf-8' }
      expect(result).to.equal(expected)
      done()

  it 'should verify all `plugins.nunjucks` options', (done) ->
    @plugin = new Plugin
      plugins:
        nunjucks:
          brunchPlugin: yes
          type: 'template'
          extension: 'html'
          path: 'public'
          templatePath: 'app/views'
          filePatterns: /^app(\/|\\)views(\/|\\).*.html$/
          test_variable: 'success'

    content = __dirname + '/variable_before.html'
    expected = fs.readFileSync __dirname + '/variable_after.html', { encoding: 'utf-8' }

    @plugin.compile '', content, (err) ->
      expect(err).not.to.be.ok
      result = fs.readFileSync compiledFolder + '/variable_before.html', { encoding: 'utf-8' }
      expect(result).to.equal(expected)
      done()

  it 'should fail if the template path is invalid', (done) ->
    content = ''

    @plugin.compile '', content, (err) ->
      expect(err).to.exist
      done()

  it 'should extend another template', (done) ->
    content = __dirname + '/extends_before.html'
    other = fs.readFileSync __dirname + '/extends_after.html', { encoding: 'utf-8' }
    expected = other

    @plugin.compile '', content, (err) ->
      expect(err).not.to.be.ok
      result = fs.readFileSync compiledFolder + '/extends_before.html', { encoding: 'utf-8' }
      expect(result).to.equal(expected)
      done()

  it 'should include another template', (done) ->
    content = __dirname + '/include_before.html'
    other = fs.readFileSync __dirname + '/include_after.html', { encoding: 'utf-8' }
    expected = other

    @plugin.compile '', content, (err) ->
      expect(err).not.to.be.ok
      result = fs.readFileSync compiledFolder + '/include_before.html', { encoding: 'utf-8' }
      expect(result).to.equal(expected)
      done()

  it 'should fail with options = undefined', (done) ->
    @plugin = new Plugin
      plugins:
        nunjucks: undefined

    content = __dirname + '/variable_before.html'

    @plugin.compile '', content, (err) ->
      expect(err).not.to.be.ok
      result = fs.readFileSync compiledFolder + '/variable_before.html', { encoding: 'utf-8' }
      expect(result).to.equal("\n")
      done()
