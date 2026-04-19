```js
var app, base, concat, directory, gulp, gutil, hostname, path, refresh, sass, uglify, del, connect, autoprefixer, babel;

var autoPrefixBrowserList = ['last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'];

gulp        = require('gulp');
gutil       = require('gulp-util');
concat      = require('gulp-concat');
uglify      = require('gulp-uglify');
sass        = require('gulp-sass');
connect     = require('gulp-connect');
del         = require('del');
autoprefixer = require('gulp-autoprefixer');
babel        = require('gulp-babel');

gulp.task('connect', function() {
  connect.server({
    root: 'app',
    livereload: true
  });
});

gulp.task('images-deploy', function() {
    gulp.src(['app/images/**/*'])
        .pipe(gulp.dest('dist/images'));
});

gulp.task('scripts', function() {
    //this is where our dev JS scripts are
    return gulp.src('app/scripts/src/**/*.js')
               .pipe(babel({ presets: ['es2015', 'react'] })
               .pipe(concat('app.js'))
               .on('error', gutil.log)
               .pipe(uglify())
               .pipe(gulp.dest('app/scripts'))
               .pipe(connect.reload());
});

gulp.task('scripts-deploy', function() {
    return gulp.src('app/scripts/src/**/*.js')
               .pipe(concat('app.js'))
               .pipe(uglify())
               .pipe(gulp.dest('dist/scripts'));
});

gulp.task('styles', function() {
    return gulp.src('app/styles/scss/init.scss')
               .pipe(sass({
                      errLogToConsole: true,
                      includePaths: [
                          'app/styles/scss/'
                      ]
               }))
               .pipe(autoprefixer({
                   browsers: autoPrefixBrowserList,
                   cascade:  true
               }))
               .on('error', gutil.log)
               .pipe(concat('styles.css'))
               .pipe(gulp.dest('app/styles'))
               .pipe(connect.reload());
});

gulp.task('styles-deploy', function() {
    return gulp.src('app/styles/scss/init.scss')
               .pipe(sass({
                      includePaths: [
                          'app/styles/scss',
                      ]
               }))
               .pipe(autoprefixer({
                   browsers: autoPrefixBrowserList,
                   cascade:  true
               }))
               .pipe(concat('styles.css'))
               .pipe(gulp.dest('dist/styles'));
});

gulp.task('html', function() {
    return gulp.src('app/*.html')
        .pipe(connect.reload())
         .on('error', gutil.log);
});

gulp.task('html-deploy', function() {
    gulp.src('app/*')
        .pipe(gulp.dest('dist'));

    gulp.src('app/.*')
        .pipe(gulp.dest('dist'));

    gulp.src('app/fonts/**/*')
        .pipe(gulp.dest('dist/fonts'));

    gulp.src(['app/styles/*.css', '!app/styles/styles.css'])
        .pipe(gulp.dest('dist/styles'));
});

gulp.task('clean', function() {
    del('dist');
});

//this is our master task when you run `gulp` in CLI / Terminal
//this is the main watcher to use when in active development
//  this will:
//  startup the web server,
//  start up livereload
//  compress all scripts and SCSS files
gulp.task('default', ['connect', 'scripts', 'styles'], function() {
    gulp.watch('app/scripts/src/**', ['scripts']);
    gulp.watch('app/styles/scss/**', ['styles']);
    gulp.watch('app/*.html', ['html']);
});

gulp.task('deploy', ['clean'], function () {
  gulp.start('scripts-deploy', 'styles-deploy', 'html-deploy', 'images-deploy');
});
```
