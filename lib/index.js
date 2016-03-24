"use strict";
var _Statistics = require("duxca.lib.statistics.js");
var _Signal = require("duxca.lib.signal.js");
var _RecordBuffer = require("duxca.lib.recordbuffer.js");
var _Wave = require("duxca.lib.wave.js");
var _OSC = require("duxca.lib.osc.js");
var _CanvasRender = require("duxca.lib.canvasrender.js");
var lib;
(function (lib) {
    lib.Statistics = _Statistics;
    lib.Signal = _Signal;
    lib.RecordBuffer = _RecordBuffer;
    lib.Wave = _Wave;
    lib.OSC = _OSC;
    lib.CanvasRender = _CanvasRender;
})(lib = exports.lib || (exports.lib = {}));
