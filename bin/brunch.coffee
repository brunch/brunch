#!/usr/bin/env coffee

sysPath = require('path')

global.isDevBrunch = true
src = sysPath.join(__dirname, '..', 'src', 'cli')
require(src).run()
