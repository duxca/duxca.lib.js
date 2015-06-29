/// <reference path="../../typings/tsd.d.ts" />

module duxca.lib {

  export class OSC {
    actx: AudioContext;

    constructor(actx:AudioContext){
      this.actx = actx;
    }
    /*
    tone(freq:number, startTime:number, duration:number):AudioNode {
      var gain, osc;
      osc = this.actx.createOscillator();
      osc.start(startTime);
      osc.stop(startTime + duration);
      gain = this.actx.createGain();
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1, startTime + 0.01);
      gain.gain.setValueAtTime(1, startTime + duration - 0.01);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(gain);
      return gain;
    }

    chirp(startFreq:number, stopFreq:number, startTime:number, duration:number):AudioNode {
      var gain, osc;
      osc = this.actx.createOscillator();
      osc.frequency.value = startFreq;
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(stopFreq, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
      gain = this.actx.createGain();
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1, (startTime + duration) / 2);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(gain);
      return gain;
    }*/
  }

}
