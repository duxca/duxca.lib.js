
QUnit.module("hello")

QUnit.test "hello test", (assert)->
  assert.ok hoge(1) is 0


QUnit.module("duxca.lib")

QUnit.test "calcCorr", (assert)->
  assert.ok calcCorr([0], [1]) instanceof Float32Array
