class OSC {

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


window.addEventListener("load", (ev)=>{
  var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));

  // raw cliped
  var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length/2);
  duxca.lib.Statictics.log(cliped_chirp);
  var actx = new AudioContext();
  var osc = new OSC(actx);
  var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
  var anode = osc.createAudioNodeFromAudioBuffer(abuf);
  anode.connect(actx.destination)
  anode.start(0);

  /*
  // noised
  var noised_chirp = new Float32Array(cliped_chirp);
  for(var i=0; i<noised_chirp.length; i++){
    noised_chirp[i] = cliped_chirp[i] + (Math.random()-1/2)*0.5;
  }
  duxca.lib.Statictics.log(noised_chirp);

  // noised_corr
  console.time("noised_corr");
  var corr = duxca.lib.Signal.correlation(cliped_chirp, noised_chirp);
  console.timeEnd("noised_corr");
  duxca.lib.Statictics.log(corr);*/


  // draw

  var render_cliped = new duxca.lib.CanvasRender(cliped_chirp.length, 128);
  //var render_noised = new duxca.lib.CanvasRender(noised_chirp.length, 128);
  document.body.appendChild(render_cliped.element);
  //document.body.appendChild(render_noised.element);
  for(var i=0; i<cliped_chirp.length; i++){
    cliped_chirp[i] = 1000*cliped_chirp[i] + 64;
    //noised_chirp[i] = 1000*noised_chirp[i] + 64;
  }
  render_cliped.drawSignal(cliped_chirp, true);
  //render_noised.drawSignal(noised_chirp, true);

  //var render_corr = new duxca.lib.CanvasRender(corr.length, 128);
  //document.body.appendChild(render_corr.element);
  //render_corr.drawSignal(corr, true, true);


});
