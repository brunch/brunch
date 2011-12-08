fs = require 'fs'
path = require 'path'
async = require 'async'
fileUtil = require 'file'

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
    assetsPath = path.resolve @getRootPath 'app', 'assets'
    async.forEach files, (from, cb) =>
      to = @getBuildPath path.resolve(from).replace assetsPath, ''
      copy = => helpers.copyFile from, to, cb
      toDirname = path.dirname to
      fs.stat toDirname, (error, stats) =>
        if error?
          process.nextTick =>
            try
              # fileUtil.mkdirs doesn't work properly.
              fileUtil.mkdirsSync path.resolve(toDirname), 0755
              copy()
            catch error
              return
        copy()
    , callback
