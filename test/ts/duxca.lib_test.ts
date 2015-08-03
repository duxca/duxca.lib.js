/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../thirdparty/dsp/dsp.d.ts" />
/// <reference path="../ts/duxca.lib.ts" />

QUnit.module("duxca.lib");

QUnit.test("calcCorr", function(assert) {
  var rslt = duxca.lib.Signal.calcCorr(new Float32Array([1, 0, 0, 0]), new Float32Array([1, 1, 1, 1]));
  return assert.ok(rslt[0] == 0.25);
});