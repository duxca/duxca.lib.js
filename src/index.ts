import _Statistics = require("duxca.lib.statistics.js");
import _Signal = require("duxca.lib.signal.js");
import _RecordBuffer = require("duxca.lib.recordbuffer.js");
import _Wave = require("duxca.lib.wave.js");
import _OSC = require("duxca.lib.osc.js");
import _CanvasRender = require("duxca.lib.canvasrender.js");
import _PNG = require("duxca.lib.png.js");
import _Metronome = require("./Metronome");
import _FPS = require("./FPS");
import _Newton = require("./Newton");
import _FDTD = require("./FDTD");
import _Chord = require("duxca.lib.chord.js");
import _Ajax = require("./Ajax");
//import _QRCode = require("./QRCode");

declare function require<T>(path: string): T;

const _SignalViewer= require<any>("./SignalViewer");
const _SGSmooth = require<any>("./SGSmooth");
const _ServerWorker= require<any>("./ServerWorker");

export namespace lib {
  export const Statistics = _Statistics;
  export const Signal = _Signal;
  export const RecordBuffer = _RecordBuffer;
  export const Wave = _Wave;
  export const OSC = _OSC;
  export const CanvasRender = _CanvasRender;
  export const Metronome = _Metronome;
  export const FPS = _FPS;
  export const Newton = _Newton;
  export const FDTD = _FDTD;
  export const Chord = _Chord;
  export const Ajax = _Ajax;
  export const PNG = _PNG;
  //export const QRCode = _QRCode;
  export const SignalViewer = _SignalViewer;
  export const SGSmooth = _SGSmooth;
  export const ServerWorker = _ServerWorker;
  export namespace Util {
    export function importObject (hash: {[key:string]: any;}): void {
      Object.keys(hash).forEach((key)=>{
        self[key] = hash[key];
        console.log("some global variables appended: ", Object.keys(hash));
      });
    }
  }
}
