var gulp = require('gulp')
var espower = require('gulp-espower')
var coffee = require('gulp-coffee')

gulp.task('build:test', function(){
  gulp.src("test/**/*.coffee")
    .pipe(coffee({bare: true}).on("error", console.error.bind(console)))
    .pipe(espower())
    .pipe(gulp.dest('demo/test'));
});

gulp.task('watch:test', function(){
  gulp.watch('test/**/*.coffee', ['build:test']);
});

gulp.task('default', ['build']);
gulp.task('build', ["build:test"]);
gulp.task('watch', ['build:test', "watch:test"]);
