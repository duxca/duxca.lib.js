gulp = require 'gulp'
ts = require 'gulp-typescript'
replace = require 'gulp-replace'
rename = require 'gulp-rename'
babel = require 'gulp-babel'
browserify = require 'browserify'
tsProject = ts.createProject 'src/tsconfig.json',
  typescript: require 'typescript'
  sortOutput: true

gulp.task('default', ['build:ts']);

gulp.task 'build:ts', ->
  tsProject.src()
    .pipe ts(tsProject)
    .pipe rename (p) -> p.dirname = p.dirname.replace('src', ''); p
    .pipe babel()
    .pipe gulp.dest 'lib'

gulp.task 'watch:ts', ->
  gulp.watch('src/**/*.ts', ['build:ts'])
