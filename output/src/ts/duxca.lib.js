var _CanvasRender = require("./CanvasRender");
var _Chord = require("./Chord");
var _FDTD = require("./FDTD");
var _FPS = require("./FPS");
var _Metronome = require("./Metronome");
var _Newton = require("./Newton");
var _OSC = require("./OSC");
var _QRcode = require("./QRCode");
var _RecordBuffer = require("./RecordBuffer");
var _Sandbox1 = require("./Sandbox1");
var _Sandbox2 = require("./Sandbox2");
var _Sandbox3 = require("./Sandbox3");
var _Sandbox4 = require("./Sandbox4");
var _Sandbox5 = require("./Sandbox5");
var _Sandbox6 = require("./Sandbox6");
var _Sandbox7 = require("./Sandbox7");
var _Sandbox8 = require("./Sandbox8");
var _Sandbox9 = require("./Sandbox9");
var _Signal = require("./Signal");
var _Statictics = require("./Statictics");
var _Wave = require("./Wave");
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        lib.CanvasRender = _CanvasRender;
        lib.Chord = _Chord;
        lib.FDTD = _FDTD;
        lib.FPS = _FPS;
        lib.Metronome = _Metronome;
        lib.Newton = _Newton;
        lib.OSC = _OSC;
        lib.QRcode = _QRcode;
        lib.RecordBuffer = _RecordBuffer;
        lib.Sandbox = [
            _Sandbox1,
            _Sandbox2,
            _Sandbox3,
            _Sandbox4,
            _Sandbox5,
            _Sandbox6,
            _Sandbox7,
            _Sandbox8,
            _Sandbox9,
        ].reduce(function (merged, obj) {
            Object.keys(obj).forEach(function (key) {
                merged[key] = obj[key];
            });
            return merged;
        }, {});
        lib.Signal = _Signal;
        lib.Statictics = _Statictics;
        lib.Wave = _Wave;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
