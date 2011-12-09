{ConcatenatingCompiler} = require './base'


class exports.CSSCompiler extends ConcatenatingCompiler
  patterns: [/\.css$/]
  destination: 'styles/main.css'
