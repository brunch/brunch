# customize default buildPath
# gets prepended to all output paths
# defaults to 'build/'
# buildPath('build/')

# stitch dependencies
dependencies = [
  'ConsoleDummy.js',
  'jquery-1.6.2.js',
  'underscore-1.1.7.js',
  'backbone-0.5.3.js'
]

files([/\.styl$/]).use('stylus').output('web/css/main.css')

files(/\.coffee$/, /src\/.*\.js$/, /\.eco$/)
  .use('stitch', {minify: false, dependencies: dependencies})
  .output('web/js/app.js')
