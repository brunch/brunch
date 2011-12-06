fs = require 'fs'
path = require 'path'

helpers = require '../helpers'
{Compiler} = require './base'


class exports.AssetsCompiler extends Compiler
  patterns: [/app\/assets\//]

  map: (file, callback) ->
    callback null, file

  reduce: (memo, file, callback) ->
    (memo ?= []).push file
    callback null, memo

  write: (files, callback) ->
    for file in files
      console.log 'Asset', file
    callback null
