
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

    createBarkerCodedChirp(barkerCodeN: number, powN: number, powL=14): Promise<Float32Array>{
      var actx = this.actx;
      var osc = this;

      var code = duxca.lib.Signal.createBarkerCode(barkerCodeN);
      var chirp = duxca.lib.Signal.createCodedChirp(code, powN);
      return this.resampling(chirp, powL);
    }

    resampling(sig: Float32Array, pow=14, sampleRate=44100): Promise<Float32Array>{
      return new Promise<Float32Array>((resolve, reject)=>{
        var abuf = this.createAudioBufferFromArrayBuffer(sig, sampleRate);// fix rate
        var anode = this.createAudioNodeFromAudioBuffer(abuf);
        var processor = this.actx.createScriptProcessor(Math.pow(2, pow), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
        var recbuf = new RecordBuffer(this.actx.sampleRate, processor.bufferSize, processor.channelCount);

        anode.start(this.actx.currentTime);
        anode.connect(processor);
        processor.connect(this.actx.destination);

        var actx = this.actx;
        processor.addEventListener("audioprocess", function handler(ev: AudioProcessingEvent){
          recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
          if(recbuf.count*recbuf.bufferSize > sig.length){
            processor.removeEventListener("audioprocess", handler);
            processor.disconnect();
            next();
          }
        });

        function next(){
          var rawdata = recbuf.merge();
          recbuf.clear();
          resolve(Promise.resolve(rawdata));
        }
      });
    }



    inpulseResponce(TEST_INPUT_MYSELF=false): void{
      var up = Signal.createChirpSignal(Math.pow(2, 17), false);
      var down = Signal.createChirpSignal(Math.pow(2, 17), true);
      //up = up.subarray(up.length*1/4|0, up.length*3/4|0);
      //down = up.subarray(up.length*1/4|0, up.length*3/4|0);

      new Promise<MediaStream>((resolbe, reject)=> navigator.getUserMedia({video: false, audio: true}, resolbe, reject) )
      .then((stream)=>{
        var source = this.actx.createMediaStreamSource(stream);
        var processor = this.actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
        var abuf = this.createAudioBufferFromArrayBuffer(up, this.actx.sampleRate);// fix rate
        var anode = this.createAudioNodeFromAudioBuffer(abuf);
        anode.start(this.actx.currentTime+0);
        anode.connect(TEST_INPUT_MYSELF?processor:this.actx.destination);
        !TEST_INPUT_MYSELF && source.connect(processor);
        processor.connect(this.actx.destination);
        var recbuf = new RecordBuffer(this.actx.sampleRate, processor.bufferSize, 1);
        var actx = this.actx;
        processor.addEventListener("audioprocess", function handler(ev: AudioProcessingEvent){
          recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
          console.log(recbuf.count);
          if(recbuf.count*recbuf.bufferSize > up.length*2){
            console.log("done");
            processor.removeEventListener("audioprocess", handler);
            processor.disconnect();
            stream.stop();
            next();
          }
        });
        function next(){
          var rawdata = recbuf.merge();
          var corr = Signal.overwarpCorr(down, rawdata);
          var render = new duxca.lib.CanvasRender(128, 128);
          console.log("raw", rawdata.length);
          render.cnv.width = rawdata.length/256;
          render.drawSignal(rawdata, true, true);
          console.screenshot(render.element);
          console.log("corr", corr.length);
          render.cnv.width = corr.length/256;
          render.drawSignal(corr, true, true);
          console.screenshot(render.element);
          console.log("up", up.length);
          render.cnv.width = up.length/256;
          render.drawSignal(up, true, true);
          console.screenshot(render.element);
          render._drawSpectrogram(rawdata, recbuf.sampleRate);
          console.screenshot(render.cnv);
        }
      });
    }
  }
}
