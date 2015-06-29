module duxca.lib {


  export class OSC {

    actx: AudioContext;

    constructor(actx:AudioContext){
      this.actx = actx;
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
