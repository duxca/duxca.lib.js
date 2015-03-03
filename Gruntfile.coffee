module.exports = (grunt) ->
  grunt.loadNpmTasks('grunt-tsd')
  grunt.loadNpmTasks('grunt-typescript')
  grunt.loadNpmTasks('grunt-contrib')
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-espower')

  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')

    tsd:
      refresh:
        options:
          command: 'reinstall'
          latest: true
          config: './tsd.json'
          opts: {}

    typescript:
      ts:
        src: ['ts/**/*.ts']
        dest: 'js'
        options:
          basePath: 'ts'
          noImplicitAny: false
          module:        'commonjs'
          target:        'es5'
          comments:      true

    coffee:
      test:
        files:
          './tests/sandbox/tests.js': ['./tests/*_test.coffee']

    concat:
      options:
        separator: ';'
      test:
        src: ['js/**/*.js'],
        dest: './tests/sandbox/bundle.js'

    espower:
      options :{
        patterns: [
            'assert(value, [message])',
            'assert.ok(value, [message])',
            'assert.equal(actual, expected, [message])',
            'assert.notEqual(actual, expected, [message])',
            'assert.strictEqual(actual, expected, [message])',
            'assert.notStrictEqual(actual, expected, [message])',
            'assert.deepEqual(actual, expected, [message])',
            'assert.notDeepEqual(actual, expected, [message])'
        ]
      },
      test:
        files: [
          {
            expand: true,        # Enable dynamic expansion.
            cwd: 'tests/sandbox',        # Src matches are relative to this path.
            src: ['tests.js'],    # Actual pattern(s) to match.
            dest: 'tests/sandbox',  # Destination path prefix.
            ext: '.js'           # Dest filepaths will have this extension.
          }
        ]

    watch:
      ts:
        files: ["ts/**/*.ts"]
        tasks: ["typescript:ts", "concat:test"]
      test:
        files: ["tests/**/*_test.coffee"]
        tasks: ["coffee:test", "espower:test"]

    connect:
      server:
        options:
          hostname: "localhost"
          port: 8888
          base: './'

  grunt.registerTask("run", ["connect", "make", "watch"])
  grunt.registerTask("make", ["typescript:ts", "coffee:test", "concat:test", "espower:test"])
  grunt.registerTask("default", ["make"])
