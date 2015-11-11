gulp = require 'gulp'
ts = require 'gulp-typescript'
rename = require 'gulp-rename'
babel = require 'gulp-babel'

tsProject = ts.createProject 'src/tsconfig.json',
  typescript: require 'typescript'
  sortOutput: true
  declaration: true


gulp.task 'build:ts', ->
  tsProject.src()
    .pipe ts(tsProject)
    .pipe rename (p) -> p.dirname = p.dirname.replace('src', ''); p
    .pipe babel()
    .pipe gulp.dest 'lib'

gulp.task 'watch:ts', ->
  gulp.watch 'src/**/*.ts', ['build:ts']

gulp.task('default', ['build']);
gulp.task('build', ['build:ts']);
gulp.task('watch', ["build", 'watch:ts']);
