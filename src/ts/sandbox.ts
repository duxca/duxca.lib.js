/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>

module duxca.lib.Sandbox {

  navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia);

  export function testDetect2(): void{
    console.group("testDetect2");
    console.time("testDetect2");

    var maybeStream = new Promise<MediaStream>((resolbe, reject)=>
      navigator.getUserMedia({video: false, audio: true}, resolbe, reject));

    maybeStream.then((stream)=>{
      var actx = new AudioContext();
      var source = actx.createMediaStreamSource(stream);
      var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1);
      source.connect(processor);
      processor.connect(actx.destination);

    }).catch(function end(err){
      err && console.error(err);
      console.timeEnd("testDetect");
      console.groupEnd();
    });
  }
  export function testDetect(): void{
    console.group("testDetect");
    console.time("testDetect");
    navigator.getUserMedia({video: false, audio: true}, (stream)=>{
      var actx = new AudioContext();
      var source = actx.createMediaStreamSource(stream);
      var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1);

      source.connect(processor);
      processor.connect(actx.destination);

      var render_corr = new duxca.lib.CanvasRender(128, 128);

      var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
      var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length/2);
      var resized_chirp = new Float32Array(processor.bufferSize*2);
      resized_chirp.set(cliped_chirp, 0);

      var cacheBuffer = new Float32Array(processor.bufferSize*2);

      var osc = new duxca.lib.OSC(actx);
      var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);

      var count = 0;
      processor.addEventListener("audioprocess", handler);

      function handler(ev: AudioProcessingEvent){
        if(count > 100) {
          stream.stop();
          return end();
        }
        if(count%2 === 0){
          var anode = osc.createAudioNodeFromAudioBuffer(abuf);
          anode.connect(actx.destination);
          anode.start(actx.currentTime);
        }
        cacheBuffer.set(ev.inputBuffer.getChannelData(0), (processor.bufferSize%2) * processor.bufferSize);

        var corr = duxca.lib.Signal.correlation(resized_chirp, cacheBuffer);
        var cliped_corr = corr.subarray(0, corr.length/2);

        console.log(
          "min", duxca.lib.Statictics.findMax(cliped_corr), "\n",
          "max", duxca.lib.Statictics.findMin(cliped_corr), "\n",
          "ave", duxca.lib.Statictics.average(cliped_corr), "\n",
          "med", duxca.lib.Statictics.median(cliped_corr), "\n",
          "var", duxca.lib.Statictics.variance(cliped_corr), "\n"
        );

        render_corr.cnv.width = cliped_corr.length;
        render_corr.drawSignal(cliped_corr, false, true);
        console.screenshot(render_corr.cnv);

        count++;
      }

    }, (err)=>{console.error(err); end();} );
    function end(){
      console.timeEnd("testDetect");
      console.groupEnd();
    }
  }

  export function testRecord(): void {
    console.group("testRecord");
    console.time("testRecord");

    navigator.getUserMedia({video: false, audio: true}, (stream)=>{
      var actx = new AudioContext();
      var source = actx.createMediaStreamSource(stream);
      var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1);
      source.connect(processor);
      processor.connect(actx.destination);

      var recbuf = new RecordBuffer(processor.bufferSize, processor.channelCount);
      var count = 0;
      processor.addEventListener("audioprocess", handler);

      function handler(ev: AudioProcessingEvent){
        if(++count > 100) {
          processor.removeEventListener("audioprocess", handler);
          stream.stop();
          var pcm = recbuf.toPCM();
          //recbuf.clear();
          var wav = new duxca.lib.Wave(recbuf.channel, actx.sampleRate, pcm);
          var audio = wav.toAudio()
          audio.loop = true;
          audio.play();
          console.log(recbuf, wav, audio);
          return end();
        }
        if(count % 10 === 0) console.log(count);
        recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
      }

    }, (err)=>{console.error(err); end();} );

    function end(){
      console.timeEnd("testRecord");
      console.groupEnd();
    }
  }

  export function testScriptProcessor(): void {
    console.group("testScriptProcessor");
    console.time("testScriptProcessor");

    navigator.getUserMedia({video: false, audio: true}, (stream)=>{
      var actx = new AudioContext();
      var source = actx.createMediaStreamSource(stream);
      var processor = actx.createScriptProcessor(Math.pow(2, 9), 1, 1);
      source.connect(processor);
      processor.connect(actx.destination);

      var spectrums: Float32Array[] = [];
      var count = 0;
      processor.addEventListener("audioprocess", handler);

      function handler(ev: AudioProcessingEvent){
        if(count > 1000) {
          processor.removeEventListener("audioprocess", handler);
          stream.stop();
          return end();
        }
        var buf = new Float32Array(ev.inputBuffer.getChannelData(0));
        var [real, imag, spectrum] = duxca.lib.Signal.fft(buf, actx.sampleRate);
        for(var i=0; i<spectrum.length;i++){
          spectrum[i] = spectrum[i]*20000;
        }
        if(spectrums.length > 200) spectrums.shift();
        spectrums.push(spectrum);
        if(++count%200 === 0) draw();
      }

      function draw(){
        var render = new duxca.lib.CanvasRender(spectrums.length, spectrums[0].length);
        render.drawSpectrogram(spectrums);
        console.screenshot(render.cnv);
      }
    }, (err)=>{console.error(err); end();} );

    function end(){
      console.timeEnd("testScriptProcessor");
      console.groupEnd();
    }
  }

  export function testSpectrum(): void {
    console.group("testSpectrum");
    console.time("testSpectrum");

    navigator.getUserMedia({video: false, audio: true}, (stream)=>{
      var actx = new AudioContext();
      var analyser = actx.createAnalyser()
      var source = actx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.smoothingTimeConstant = 0;
      analyser.fftSize = 512;
      var fftdata = new Uint8Array(analyser.frequencyBinCount);
      var spectrums: Uint8Array[] = [];
      var count = 0;

      console.log("make noise and wait few sec");
      recur();

      function recur(){
        if(count++ > 1000){
          stream.stop();
          return end();
        }
        if(count % 100 === 0) draw();
        analyser.getByteFrequencyData(fftdata);
        spectrums.push(new Uint8Array(fftdata));
        requestAnimationFrame(recur);
      }

      function draw(){
        console.log(count);
        var render = new duxca.lib.CanvasRender(spectrums.length, spectrums[0].length);
        render.drawSpectrogram(spectrums);
        console.screenshot(render.cnv);
      }

    }, (err)=>{console.error(err); end();} );

    function end(){
      console.timeEnd("testSpectrum");
      console.groupEnd();
    }
  }

  export function testOSC(): void {
    console.group("testOSC");
    console.time("testOSC");

    // raw cliped
    var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
    var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length/2);

    var actx = new AudioContext();
    var osc = new duxca.lib.OSC(actx);
    var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
    var anode = osc.createAudioNodeFromAudioBuffer(abuf);
    anode.connect(actx.destination)
    anode.start(0);

    console.timeEnd("testOSC");
    console.groupEnd();
  }

  export function testChirp(): void {
    console.group("testChirp");
    console.time("testChirp");

    // raw cliped
    var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
    var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length/2);

    // noised
    var noised_chirp = new Float32Array(cliped_chirp);
    for(var i=0; i<noised_chirp.length; i++){
      noised_chirp[i] = cliped_chirp[i] + (Math.random()-1/2)*0.5;
    }

    // noised_corr
    console.time("noised_corr");
    var corr = duxca.lib.Signal.correlation(cliped_chirp, noised_chirp);
    console.timeEnd("noised_corr");

    // draw
    var render_cliped = new duxca.lib.CanvasRender(cliped_chirp.length, 128);
    var render_noised = new duxca.lib.CanvasRender(noised_chirp.length, 128);
    var render_corr = new duxca.lib.CanvasRender(corr.length, 128);
    var _cliped_chirp = new Float32Array(noised_chirp.length);
    var _noised_chirp = new Float32Array(cliped_chirp.length);
    for(var i=0; i<cliped_chirp.length; i++){
      _cliped_chirp[i] = 1000*cliped_chirp[i] + 64;
      _noised_chirp[i] = 1000*noised_chirp[i] + 64;
    }
    render_cliped.drawSignal(_cliped_chirp, true);
    render_noised.drawSignal(_noised_chirp, true);
    render_corr.drawSignal(corr, true, true);

    console.screenshot(render_cliped.cnv);
    duxca.lib.Statictics.all(cliped_chirp);
    console.screenshot(render_noised.cnv);
    duxca.lib.Statictics.all(noised_chirp);
    console.screenshot(render_corr.cnv);
    duxca.lib.Statictics.all(corr);

    console.timeEnd("testChirp");
    console.groupEnd();
  }
}
