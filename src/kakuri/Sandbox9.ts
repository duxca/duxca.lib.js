/// <reference path="../../typings/tsd.d.ts"/>

import CanvasRender from "./CanvasRender";
import Signal from "./Signal";
import RecordBuffer from "./RecordBuffer";
import OSC from "./OSC";
import FPS from "./FPS";
import Wave from "./Wave";
import Metronome from "./Metronome";
import Statictics from "./Statictics";
import {Chord, Token} from "./Chord";
import Newton from "./Newton";
import Point = Newton.Point;
import SDM = Newton.SDM;
import QRcode from "./QRcode";
import FDTD from "./FDTD";

namespace Sandbox {
  export function drawSignal(){
    function draw(signal: Float32Array){
      var render = new CanvasRender(signal.length*2, 100);
      document.body.appendChild(render.cnv);
      render.drawSignal(signal, true, true);
    }
    var signal = new Float32Array(1024);
    for(let i = 0; i<signal.length; i++)
      signal[i] = Math.sin(i) * Math.sin(i/10) + Math.cos(i/100);

    draw(signal);

    var [real, imag, spec] = Signal.fft(signal);

    draw(real);
    draw(imag);

    var abs = new Float32Array(real.length);
    for(let i = 0; i<real.length; i++)
      abs[i] = Math.sqrt(real[i]*real[i] + imag[i]*imag[i]);

    draw(abs);

    for(let i = 0; i<real.length; i++){
      real[i] = real[i]/abs[i];
      imag[i] = imag[i]/abs[i];
    }

    draw(real);
    draw(imag);

    var pos = Signal.ifft(real, imag);
    draw(pos);

  }
}
export = Sandbox;
