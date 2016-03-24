import _Statistics = require("duxca.lib.statistics.js");
import _Signal = require("duxca.lib.signal.js");
import _RecordBuffer = require("duxca.lib.recordbuffer.js");
import _Wave = require("duxca.lib.wave.js");
import _OSC = require("duxca.lib.osc.js");
import _CanvasRender = require("duxca.lib.canvasrender.js");
import _Metronome = require("./Metronome");
import _FPS = require("./FPS");
import _Newton = require("./Newton");
import _FDTD = require("./FDTD");
import _Chord = require("./Chord");
import _Ajax = require("./Ajax");
export declare namespace lib {
    const Statistics: typeof _Statistics;
    const Signal: typeof _Signal;
    const RecordBuffer: typeof _RecordBuffer;
    const Wave: typeof _Wave;
    const OSC: typeof _OSC;
    const CanvasRender: typeof _CanvasRender;
    const Metronome: typeof _Metronome;
    const FPS: typeof _FPS;
    const Newton: typeof _Newton;
    const FDTD: typeof _FDTD;
    const Chord: typeof _Chord;
    const Ajax: typeof _Ajax;
    const SignalViewer: any;
    namespace Util {
        function importObject(hash: {
            [key: string]: any;
        }): void;
    }
}
