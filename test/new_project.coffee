fs = require 'fs'

brunch  = require '../src/brunch'
specHelpers = require './spec_helpers'


describe 'new project', ->
  describe 'default', ->
    it 'should be created', (done) ->
      brunch.new
        appPath: 'brunch'
        buildPath: 'brunch/build'
      , ->
        (typeof fs.statSync 'brunch').should.eql 'object'
        (typeof fs.statSync 'brunch/build').should.eql 'object'
        specHelpers.removeDirectory 'brunch', done

  describe 'with nested directories', ->
    it 'should be created', (done) ->
      brunch.new
        appPath: 'js/client'
        buildPath: 'js/output'
      , ->
        (typeof fs.statSync 'js/client/src').should.eql 'object'
        (typeof fs.statSync 'js/output').should.eql 'object'
        specHelpers.removeDirectory 'js', done
