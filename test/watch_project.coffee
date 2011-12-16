fs = require 'fs'
path = require 'path'
zombie = require 'zombie'
{spawn} = require 'child_process'

brunch  = require '../src/brunch'

write = ->

###
describe 'project watching', ->
  describe 'should recompile project', ->
    beforeAll ->
      #brunch.watch 'test/fixtures/project'
    describe 'in generic project', ->
      it 'when file has been added', ->
        write 'app/thing.js', ->
        write 'app/thing.coffee', ->
        write 'app/styles/thing.css', ->
        write 'app/styles/thing.styl', ->
        write 'app/styles/templates/template.eco', ->
          
      it 'when file has been changed', ->
      it 'when file has been deleted', ->
###
