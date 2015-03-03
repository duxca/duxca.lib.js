
QUnit.module("hello")

QUnit.test "hello test", (assert)->
  assert.ok hoge(1) is 0
