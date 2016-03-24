"use strict";
var _Statistics = require("duxca.lib.statistics.js");
var _Signal = require("duxca.lib.signal.js");
var _RecordBuffer = require("duxca.lib.recordbuffer.js");
var _Wave = require("duxca.lib.wave.js");
var _OSC = require("duxca.lib.osc.js");
var _CanvasRender = require("duxca.lib.canvasrender.js");
var _Metronome = require("./Metronome");
var _FPS = require("./FPS");
var _Newton = require("./Newton");
var _FDTD = require("./FDTD");
var _Chord = require("./Chord");
var _Ajax = require("./Ajax");
var _SignalViewer = require("./SignalViewer");
var lib;
(function (lib) {
    lib.Statistics = _Statistics;
    lib.Signal = _Signal;
    lib.RecordBuffer = _RecordBuffer;
    lib.Wave = _Wave;
    lib.OSC = _OSC;
    lib.CanvasRender = _CanvasRender;
    lib.Metronome = _Metronome;
    lib.FPS = _FPS;
    lib.Newton = _Newton;
    lib.FDTD = _FDTD;
    lib.Chord = _Chord;
    lib.Ajax = _Ajax;
    //export const QRCode = _QRCode;
    lib.SignalViewer = _SignalViewer;
    var Util;
    (function (Util) {
        function importObject(hash) {
            Object.keys(hash).forEach(function (key) {
                self[key] = hash[key];
                console.log("some global variables appended: ", Object.keys(hash));
            });
        }
        Util.importObject = importObject;
    })(Util = lib.Util || (lib.Util = {}));
})(lib = exports.lib || (exports.lib = {}));
