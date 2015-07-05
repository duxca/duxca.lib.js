module duxca.lib {


  export class OSC {

    actx: AudioContext;

    constructor(actx:AudioContext){
      this.actx = actx;
    }

    tone(freq:number, startTime:number, duration:number):AudioNode {
      var osc = this.actx.createOscillator();
      osc.start(startTime);
      osc.stop(startTime + duration);
      var gain = this.actx.createGain();
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1, startTime + 0.01);
      gain.gain.setValueAtTime(1, startTime + duration - 0.01);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(gain);
      return gain;
    }

    createAudioBufferFromArrayBuffer(arr: Float32Array, sampleRate: number): AudioBuffer{
      var abuf = this.actx.createBuffer(1, arr.length, sampleRate);
      var buf = <Float32Array>abuf.getChannelData(0);
      buf.set(arr);
      return abuf;
    }

    createAudioNodeFromAudioBuffer(abuf: AudioBuffer): AudioBufferSourceNode {
      var asrc = this.actx.createBufferSource();
      asrc.buffer = abuf;
      return asrc;
    }

  }
}
