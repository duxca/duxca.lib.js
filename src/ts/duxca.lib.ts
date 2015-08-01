import _CanvasRender = require("./CanvasRender");
import _Chord = require("./Chord");
import _FDTD = require("./FDTD");
import _FPS = require("./FPS");
import _Metronome = require("./Metronome");
import _Newton = require("./Newton");
import _OSC = require("./OSC");
import _QRcode = require("./QRCode");
import _RecordBuffer = require("./RecordBuffer");
import _Sandbox1 = require("./Sandbox1");
import _Sandbox2 = require("./Sandbox2");
import _Sandbox3 = require("./Sandbox3");
import _Sandbox4 = require("./Sandbox4");
import _Sandbox5 = require("./Sandbox5");
import _Sandbox6 = require("./Sandbox6");
import _Sandbox7 = require("./Sandbox7");
import _Sandbox8 = require("./Sandbox8");
import _Sandbox9 = require("./Sandbox9");
import _Signal = require("./Signal");
import _Statictics = require("./Statictics");
import _Wave = require("./Wave");

namespace duxca.lib {
  export var CanvasRender = _CanvasRender;
  export var Chord = _Chord;
  export var FDTD = _FDTD;
  export var FPS = _FPS;
  export var Metronome = _Metronome;
  export var Newton = _Newton;
  export var OSC = _OSC;
  export var QRcode = _QRcode;
  export var RecordBuffer = _RecordBuffer;
  export var Sandbox = [
    _Sandbox1,
    _Sandbox2,
    _Sandbox3,
    _Sandbox4,
    _Sandbox5,
    _Sandbox6,
    _Sandbox7,
    _Sandbox8,
    _Sandbox9,
  ].reduce<any>((merged, obj)=>{
    Object.keys(obj).forEach((key)=>{
      merged[key] = (<any>obj)[key];
    });
    return merged;
  }, {});
  export var Signal = _Signal;
  export var Statictics = _Statictics;
  export var Wave = _Wave;
}
