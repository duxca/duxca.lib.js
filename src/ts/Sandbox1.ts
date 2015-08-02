/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>

import CanvasRender = require("./CanvasRender");
import Signal = require("./Signal");
import RecordBuffer = require("./RecordBuffer");
import OSC = require("./OSC");
import FPS = require("./FPS");
import Wave = require("./Wave");
import Metronome = require("./Metronome");
import Statictics = require("./Statictics");
import Chord = require("./Chord");

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia);

namespace Sandbox {

  /*console.screenshot = (cnv)=>{
    var img = new Image();
    img.src = cnv.toDataURL("image/png");
    document.body.appendChild(img);
    document.body.appendChild(document.createElement("br"));
  };*/

  export function testDetect3(): void{
    var PULSE_BOOST_COUNT = 1;
    var PULSE_INTERVAL_SEC = 0.5;
    var RECORD_SEC = 11;
    var CUTOFF_STANDARDSCORE = 100;
    var TEST_INPUT_MYSELF = false;

    console.group("testDetect3");
    console.time("testDetect3");

    var maybeStream = new Promise<MediaStream>((resolbe, reject)=>
      navigator.getUserMedia({video: false, audio: true}, resolbe, reject));

    maybeStream.then((stream)=>{
      var actx = new AudioContext();
      var source = actx.createMediaStreamSource(stream);
      var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
      !TEST_INPUT_MYSELF && source.connect(processor);
      processor.connect(actx.destination);

      console.group("create barker coded chirp signal");
      console.time("create barker coded chirp signal");
      var a = Signal.createBarkerCode(1);
      console.log(a.length);
      var pulse = Signal.createCodedChirp(a, 12);//var pulse = Signal.createBarkerCodedChirp(11, 8);
      for(var pow=0; pulse.length*PULSE_BOOST_COUNT > Math.pow(2, pow); pow++);//for(var pow=0; pulse.length > Math.pow(2, pow); pow++); // ajasting power of two for FFT
      var barkerChirp = new Float32Array(Math.pow(2, pow));
      for(var i=0; i<PULSE_BOOST_COUNT; i++){
        barkerChirp.set(pulse, pulse.length*i);
      }
      console.log(pulse.length, barkerChirp.length);
      console.timeEnd("create barker coded chirp signal");
      console.groupEnd();

      console.group("show chirp");
      console.time("show chirp");
      var render = new CanvasRender(128, 128);
      var _pulse = Signal.normalize(pulse, 128);
      var splitsize = Math.pow(2, 10);
      var lastptr = 0;
      for(var i=0; i<_pulse.length; i+=splitsize){
        var part = _pulse.subarray(i, i+splitsize);
        render.cnv.width = part.length;
        render.drawSignal(part, false, false);
        console.log(
          lastptr+"-"+(i+splitsize)+"/"+_pulse.length,
          (i-lastptr)/actx.sampleRate*1000+"ms",
          render.cnv.width+"x"+render.cnv.height
        );
        console.screenshot(render.element);
        lastptr = i;
      }
      console.timeEnd("show chirp");
      console.groupEnd();

      console.group("requestAnimationFrame, audioprocess, metronome");
      console.time("requestAnimationFrame, audioprocess, metronome");
      return new Promise<[RecordBuffer, Float32Array]>((resolve, reject)=>{

        var osc = new OSC(actx);
        var abuf = osc.createAudioBufferFromArrayBuffer(barkerChirp, 44100);
        var recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
        var met = new Metronome(actx, PULSE_INTERVAL_SEC);
        var rfps = new FPS(1000);
        var pfps = new FPS(1000);
        met.nextTick = nextTick;
        processor.addEventListener("audioprocess", handler);
        nextTick();
        recur();

        function handler(ev: AudioProcessingEvent){
          pfps.step();
          recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
        }

        function nextTick(){
          var anode = osc.createAudioNodeFromAudioBuffer(abuf);
          anode.connect(TEST_INPUT_MYSELF?processor:actx.destination);
          anode.start(met.nextTime);
        }

        function recur(){
          console.log(rfps+"/60", pfps+"/"+(actx.sampleRate/processor.bufferSize*1000|0)/1000);
          rfps.step();
          if(actx.currentTime > RECORD_SEC) {
            setTimeout(()=>{
              stream.stop();
              processor.removeEventListener("audioprocess", handler);
              console.timeEnd("requestAnimationFrame, audioprocess, metronome");
              console.groupEnd();
              resolve(Promise.resolve([recbuf, barkerChirp]));
            }, met.interval*1.5*1000);// wait beep
            return;
          }
          met.step();
          requestAnimationFrame(recur);
        }
      });
    }).then(([recbuf, barkerChirp])=>{
      console.group("show record");
      console.time("show record");
      var pcm = recbuf.toPCM();
      var wav = new Wave(recbuf.channel, recbuf.sampleRate, pcm);
      var audio = wav.toAudio();
      //audio.autoplay = true;
      document.body.appendChild(audio);
      console.timeEnd("show record");
      console.groupEnd();

      console.group("calc correlation");
      console.time("calc correlation");
      var rawdata = recbuf.merge();
      recbuf.clear();
      var windowsize = barkerChirp.length;
      var resized_charp = new Float32Array(windowsize*2); // for overwrap adding way correlation
      resized_charp.set(barkerChirp, 0);
      var buffer = new Float32Array(windowsize*2); // for overwrap adding way correlation
      var correlation = new Float32Array(rawdata.length);
      for(var i=0; rawdata.length - (i+windowsize) >= resized_charp.length; i+=windowsize){
        buffer.set(rawdata.subarray(i, i+windowsize), 0);
        var corr = Signal.correlation(buffer, resized_charp);
        for(var j=0; j<corr.length; j++){
          correlation[i+j] = corr[j];
        }
      }
      console.timeEnd("calc correlation");
      console.groupEnd();

      console.group("calc stdscores");
      console.time("calc stdscores");
      var _correlation = Signal.normalize(correlation, 100);
      var ave = Statictics.average(_correlation);
      var vari = Statictics.variance(_correlation);
      console.log(
        "ave:", ave, "\n",
        "med:", Statictics.median(_correlation), "\n",
        "var:", vari, "\n"
      );
      var stdscores = new Float32Array(_correlation.length);
      for(var i=0; i<_correlation.length; i++){
        stdscores[i] = 10*(_correlation[i] - ave)/vari+50;
      }
      console.timeEnd("calc stdscores");
      console.groupEnd();

      console.group("show correlation and stdscores");
      console.time("show correlation and stdscores");
      var render = new CanvasRender(128, 128);
      var splitsize = Math.pow(2, 10);
      var _correlation = Signal.normalize(correlation, 128);
      var _stdscores = Signal.normalize(stdscores, 128);
      var min = Statictics.findMin(stdscores)[0];
      var max = Statictics.findMax(stdscores)[0];
      var stdscoreline = new Float32Array(splitsize);
      for(var i=0; i<stdscoreline.length; i++){
        stdscoreline[i] = (CUTOFF_STANDARDSCORE - min) / (max - min) * 128;
      }
      var lastptr = 0;
      var count = 0;
      for(var i=0; i<_correlation.length; i+=splitsize){
        var corpart = _correlation.subarray(i, i+splitsize);
        var stdpart = _stdscores.subarray(i, i+splitsize);
        render.cnv.width = corpart.length;
        render.ctx.strokeStyle = "gray";
        render.drawSignal(stdpart);
        render.ctx.strokeStyle = "gray";
        render.drawSignal(stdscoreline);
        if(i%(PULSE_INTERVAL_SEC*recbuf.sampleRate) > (i+splitsize)%(PULSE_INTERVAL_SEC*recbuf.sampleRate)){
          var intvlptr = ((i/(PULSE_INTERVAL_SEC*recbuf.sampleRate)|0)+1)*PULSE_INTERVAL_SEC*recbuf.sampleRate;
          render.ctx.strokeStyle = "red";
          render.drawColLine(intvlptr-i);
          count++;
        }
        console.log(
          ""+count,
          lastptr+"-"+(i-1)+"/"+_correlation.length,
          (i-lastptr)/recbuf.sampleRate*1000+"ms",
          render.cnv.width+"x"+render.cnv.height
        );
        for(var j=i;j<i+splitsize; j++){
          if(stdscores[j] > CUTOFF_STANDARDSCORE){
            console.log("stdscore", stdscores[j], j);
          }
        }
        render.ctx.strokeStyle = "black";
        render.drawSignal(corpart);
        console.screenshot(render.cnv);
        lastptr = i;
      }
      console.timeEnd("show correlation and stdscores");
      console.groupEnd();

      console.group("calc cycle");
      console.time("calc cycle");
      var splitsize = PULSE_INTERVAL_SEC*recbuf.sampleRate;
      var results:number[] = [];
      var count = 0;
      var lastptr = 0;
      for(var i=splitsize; i<stdscores.length; i+=splitsize){
        var stdpart = stdscores.subarray(i, i+splitsize);
        var [max_score, offset] = Statictics.findMax(stdpart);
        console.log(count++, i+offset, offset, i+offset-lastptr, max_score);
        results.push(offset);
        lastptr = i+offset;
      }
      results.shift();
      results.pop();
      console.log(results);
      console.log(
        "min", Statictics.findMin(results)[0], "\n",
        "max", Statictics.findMax(results)[0], "\n",
        "ave", Statictics.average(results), "\n",
        "med", Statictics.median(results), "\n",
        "mode", Statictics.mode(results), "\n",
        "stdev", Statictics.stdev(results)
      );
      console.timeEnd("calc cycle");
      console.groupEnd();

      console.group("show spectrogram");
      console.time("show spectrogram");
      return new Promise<[Float32Array, Float32Array]>((resolve, reject)=>{
        var windowsize = Math.pow(2, 8); // spectrgram height
        var slidewidth = Math.pow(2, 6); // spectrgram width rate
        var sampleRate = recbuf.sampleRate;
        console.log(
          "sampleRate:", sampleRate, "\n",
          "windowsize:", windowsize, "\n",
          "slidewidth:", slidewidth, "\n",
          "windowsize(ms):", windowsize/sampleRate*1000, "\n",
          "slidewidth(ms):", slidewidth/sampleRate*1000, "\n"
        );
        var spectrums: Float32Array[] = [];
        var ptr = 0;
        var lstptr = 0;
        var count = 0;
        recur();

        function recur(){
          if(ptr+windowsize > rawdata.length){
            draw();
            console.timeEnd("show spectrogram");
            console.groupEnd();
            return resolve(Promise.resolve([rawdata, barkerChirp]));
          }
          var spectrum = Signal.fft(rawdata.subarray(ptr, ptr+windowsize), sampleRate)[2];
          for(var i=0; i<spectrum.length;i++){
            spectrum[i] = spectrum[i]*20000;
          }
          spectrums.push(spectrum);
          if(count%512===511){
            draw();
          }
          ptr += slidewidth;
          count++;
          setTimeout(recur);
        }

        function draw(){
          console.log(
            "ptr", lstptr+"-"+(ptr-1)+"/"+rawdata.length,
            "ms", lstptr/sampleRate*1000+"-"+(ptr-1)/sampleRate*1000+"/"+rawdata.length*1000/sampleRate,
            spectrums.length+"x"+spectrums[0].length
          );
          render.cnv.width = spectrums.length;
          render.cnv.height = spectrums[0].length;
          render.drawSpectrogram(spectrums);
          console.screenshot(render.cnv);
          spectrums = [];
          lstptr = ptr;
        }
      });
    }).catch(function end(err){
      console.error(err);
      err instanceof Error && console.error(err.stack);
    }).then(()=>{
      console.timeEnd("testDetect2");
      console.groupEnd();
    });
  }



  export function testAutoDetect(id?:string): void{
    var chd = new Chord();
    var actx = new AudioContext();
    chd.on("tone", (token, cb)=>{
      console.log("tone");
      (new OSC(actx)).tone(100, actx.currentTime, 1).connect(actx.destination)
      setTimeout(()=>{
        cb(token);
      }, 1000);
    });
    if(typeof id === "string"){
      chd.join(id);
    }else{
      chd.create().then(()=>{
        setInterval(()=>{
          chd.request("tone").then((token)=>{console.log(token.payload.event, token)});
        }, 15000);
      });
    }
  }



  export function testChord(id?:string): void{
    var chd0 = new Chord();
    var a = (token:Chord.Token, cb:(token:Chord.Token)=>void)=>{ cb(token); };
    var chd1 = new Chord();
    var chd2 = new Chord();
    var chd3 = new Chord();
    var chd4 = new Chord();
    chd0.create().then(()=>{
      return chd1.join(chd0.peer.id).then(()=>{
        return chd2.join(chd0.peer.id).then(()=>{
          return chd3.join(chd2.peer.id).then(()=>{
            return chd4.join(chd3.peer.id).then(()=>{
              setInterval(function(){
                chd1.request("ping").then((token)=>{console.log("PING", token)});
                [chd0, chd1, chd2, chd3, chd4].forEach(function(chd, i){
                  console.info(i, chd.predecessor&&chd.predecessor.open, chd.predecessor&&chd.predecessor.peer, chd.peer.id, chd.successor&&chd.successor.peer, chd.successor&&chd.successor.open, chd.successors);
                });
              }, 2000);
              setTimeout(function(){
                console.warn("chd4 destroied");
                chd4.peer.destroy();
              }, 20000);
              setTimeout(function(){
                console.warn("chd0 destroied");
                chd0.peer.destroy();
              }, 40000);
            });
          });
        });
      });
    }).catch((err)=>{console.error(err)});
  }



  export function testDetect2(): void{
    console.group("testDetect2");
    console.time("testDetect2");

    var maybeStream = new Promise<MediaStream>((resolbe, reject)=>
      navigator.getUserMedia({video: false, audio: true}, resolbe, reject));

    maybeStream.then((stream)=>{
      var actx = new AudioContext();
      var source = actx.createMediaStreamSource(stream);
      var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1);
      //source.connect(processor);
      processor.connect(actx.destination);

      var pulse = Signal.createBarkerCodedChirp(13, 12);
      for(var pow=0; pulse.length > Math.pow(2, pow); pow++);
      var cliped_chirp = new Float32Array(Math.pow(2, pow));
      cliped_chirp.set(pulse, 0);
      console.log(pulse.length, cliped_chirp.length);

      var osc = new OSC(actx);
      var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
      var met = new Metronome(actx, 1);
      var rfps = new FPS(1000);
      var pfps = new FPS(1000);

      var recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);

      return new Promise<[RecordBuffer, Float32Array]>((resolve, reject)=>{
        console.group("fps\trequestAnimationFrame\taudioprocess");

        recur();
        nextTick();
        met.nextTick = nextTick;
        processor.addEventListener("audioprocess", handler);

        function nextTick(){
          var anode = osc.createAudioNodeFromAudioBuffer(abuf);
          anode.connect(processor)//actx.destination);
          anode.start(met.nextTime);
        }

        function recur(){
          console.log(rfps+"/60\t"+pfps+"/"+(actx.sampleRate/processor.bufferSize*1000|0)/1000);
          rfps.step();
          if(actx.currentTime > 10) {
            setTimeout(()=>{
              stream.stop();
              processor.removeEventListener("audioprocess", handler);
              console.groupEnd();
              resolve(Promise.resolve([recbuf, cliped_chirp]));
            }, met.interval*1000);
            return;
          }
          met.step();
          setTimeout(recur, 0);
        }

        function handler(ev: AudioProcessingEvent){
          pfps.step();
          recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
        }
      });
    }).then(([recbuf, cliped_chirp])=>{
      var render = new CanvasRender(128, 128);

      console.group("cliped_chirp:"+cliped_chirp.length);
      var min = Statictics.findMin(cliped_chirp)[0];
      for (var i = 0; i < cliped_chirp.length; i++) {
        cliped_chirp[i] = cliped_chirp[i] + Math.abs(min);
      }
      render.cnv.width = cliped_chirp.length;
      render.drawSignal(cliped_chirp, false, true);
      console.screenshot(render.cnv);
      console.groupEnd();

      var pcm = recbuf.toPCM();
      var wav = new Wave(recbuf.channel, recbuf.sampleRate, pcm);
      var audio = wav.toAudio();
      //audio.autoplay = true;
      document.body.appendChild(audio);

      var rawdata = recbuf.merge(0);

      console.group("rawdata:"+rawdata.length);
      return new Promise<[Float32Array, Float32Array]>((resolve, reject)=>{
        var windowsize = Math.pow(2, 8);
        var slidewidth = Math.pow(2, 6);
        var sampleRate = recbuf.sampleRate;
        console.log(
          "sampleRate:", sampleRate, "\n",
          "windowsize:", windowsize, "\n",
          "slidewidth:", slidewidth, "\n",
          "windowsize(ms):", windowsize/sampleRate*1000, "\n",
          "slidewidth(ms):", slidewidth/sampleRate*1000, "\n"
        );
        var spectrums: Float32Array[] = [];
        var ptr = 0;
        var lstptr = 0;
        var count = 0;
        recur();

        function recur(){
          if(ptr+windowsize > rawdata.length){
            draw();
            console.groupEnd();
            return resolve(Promise.resolve([rawdata, cliped_chirp]));
          }
          var spectrum = Signal.fft(rawdata.subarray(ptr, ptr+windowsize), recbuf.sampleRate)[2];
          for(var i=0; i<spectrum.length;i++){
            spectrum[i] = spectrum[i]*20000;
          }
          spectrums.push(spectrum);
          if(count%512===511){
            draw();
          }
          ptr += slidewidth;
          count++;
          setTimeout(recur);
        }

        function draw(){
          console.log(
            lstptr+"-"+(ptr-1)+"/"+rawdata.length,
            (ptr-lstptr)/sampleRate*1000+"ms",
            spectrums.length+"x"+spectrums[0].length
          );
          render.cnv.width = spectrums.length;
          render.cnv.height = spectrums[0].length;
          render.drawSpectrogram(spectrums);
          console.screenshot(render.cnv);
          spectrums = [];
          lstptr = ptr;
        }
      });
    }).then(([rawdata, cliped_chirp])=>{
      console.group("correlation");
      console.time("correlation");
      console.log(rawdata.length, cliped_chirp.length);

      var windowsize = cliped_chirp.length;
      var resized_charp = new Float32Array(windowsize*2);
      resized_charp.set(cliped_chirp, 0);
      var tmp = new Float32Array(windowsize*2);
      var concat_corr = new Float32Array(rawdata.length);

      for(var i=0; rawdata.length - (i+windowsize) >= resized_charp.length; i+=windowsize){
        var sig = rawdata.subarray(i, i+windowsize);
        tmp.set(sig, 0);
        var corr = Signal.correlation(tmp, resized_charp);
        for(var j=0;j<corr.length;j++){
          concat_corr[i+j] = corr[j];
        }
      }

      console.timeEnd("correlation");
      console.groupEnd();

      console.group("show correlation");
      console.time("show correlation");

      var concat_corr = Signal.normalize(concat_corr, 100);
      var ave = Statictics.average(concat_corr);
      var vari = Statictics.variance(concat_corr);
      console.log(
        "ave:", ave, "\n",
        "med:", Statictics.median(concat_corr), "\n",
        "var:", vari, "\n"
      );

      var stdscores:number[] = [];
      for(var i=0; i<concat_corr.length; i++){
        var stdscore = 10*(concat_corr[i] - ave)/vari+50;
        stdscores.push(stdscore);
      }

      var render = new CanvasRender(128, 128);

      var goodscoreIds:number[] = [];
      var splitsize = Math.pow(2, 10);
      for(var i=0; i<concat_corr.length; i+=splitsize){
        var _corr = concat_corr.subarray(i, i+splitsize);
        var __corr = concat_corr.subarray(i, i+splitsize*2);

        console.log("ptr:", i);
        render.cnv.width = _corr.length;
        render.drawSignal(_corr);

        for(var j=i; j<i+splitsize; j++){
          if(stdscores[j]>200){
            var localscore = Statictics.stdscore(__corr, __corr[j-i]);
            if(localscore>60){
              goodscoreIds.push(j);
              console.log("stdscore", stdscores[j], localscore, "index", j);
              render.drawColLine(j-i);
            }
          }
        }

        console.screenshot(render.cnv);
      }

      console.timeEnd("correlation show");
      console.groupEnd();

      console.group("clustering");
      console.time("clustering");

      console.log(goodscoreIds);
      var clusterN = 10;
      var clusterized = Statictics.k_means1D(goodscoreIds, clusterN)
      console.log(clusterized);
      var clusterIds:number[][] = [];
      for(var j=0; j<clusterN; j++){
        clusterIds[j] = [];
      }
      for(var i=0; i<clusterized.length; i++){
        clusterIds[clusterized[i]].push(goodscoreIds[i]);
      }
      console.log(clusterIds);
      var results: number[] = [];
      for(var i=0; i<clusterIds.length; i++){
        var [stdscore, _id] = Statictics.findMax(clusterIds[i].map((id)=> stdscores[id]));
        var id = clusterIds[i][_id];
        var val = concat_corr[id];
        console.log("index", id, "val", val, "stdscore", stdscore);
        results.push(id);
      }

      console.log(results.sort((a, b)=> a - b));
      var _interval:number[] = [];
      for(var i=1; i<results.length; i++){
        _interval[i-1] = results[i] - results[i-1];
      }
      console.log(_interval);

      console.timeEnd("clustering");
      console.groupEnd();


    }).catch(function end(err){
      console.error(err);
    }).then(()=>{
      console.timeEnd("testDetect2");
      console.groupEnd();
    });
  }



  export function testKmeans(): void{
    var arr = [1,2,3,4,5,30,435,46,3,436,63];
    console.log(arr);
    console.log(Statictics.k_means1D(arr, 3));
  }



  export function testComplementaryCode(n:number=0){
    var [a, b] = Signal.createComplementaryCode(n);
    console.log(0, a, b);
    var _a = Signal.autocorr(a)
    var _b = Signal.autocorr(b)
    console.log(_a);
    console.log(_b);
    console.log(_a.map((x, i)=> x+_b[i]));
  }



  export function showChirp(): void{
    var bitwidth = Math.pow(2, 10);
    var up_chirp = Signal.createChirpSignal(bitwidth);
    var down_chirp = new Float32Array(up_chirp);
    for(var i=0; i<down_chirp.length; i++){
      down_chirp[i] *= -1;
    }
    var render = new CanvasRender(128, 128);
    render.cnv.width = up_chirp.length;
    render.drawSignal(up_chirp, true, true);
    console.screenshot(render.element);
    render.cnv.width = up_chirp.length;
    render.drawSignal(down_chirp, true, true);
    console.screenshot(render.element);
    /*
    var pulse = new Float32Array(bitwidth/2*5);
    var code = Signal.createBarkerCode(4);
    for(var i=0; i<code.length; i++){
      for(var j=0; j<bitwidth; j++){
        pulse[i*bitwidth/2+j] += (code[i] === 1) ? up_chirp[j] : down_chirp[j];
      }
    }*/
    var pulse = Signal.createBarkerCodedChirp(13);
    render.cnv.width = pulse.length;
    render.drawSignal(pulse, true, true);
    console.screenshot(render.element);

    render.cnv.width = 1024;
    render.drawSignal(pulse, true, true);
    console.screenshot(render.element);
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

      var render_corr = new CanvasRender(128, 128);

      var raw_chirp = Signal.createChirpSignal(Math.pow(2, 10));
      var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length/2);
      var resized_chirp = new Float32Array(processor.bufferSize*2);
      resized_chirp.set(cliped_chirp, 0);

      var cacheBuffer = new Float32Array(processor.bufferSize*2);

      var osc = new OSC(actx);
      var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);

      var count = 0;
      processor.addEventListener("audioprocess", handler);

      function handler(ev: AudioProcessingEvent){
        if(count > 100) {
          processor.removeEventListener("audioprocess", handler);
          stream.stop();
          return end();
        }
        if(count%2 === 0){
          var anode = osc.createAudioNodeFromAudioBuffer(abuf);
          anode.connect(actx.destination);
          anode.start(actx.currentTime);
        }
        cacheBuffer.set(ev.inputBuffer.getChannelData(0), (processor.bufferSize%2) * processor.bufferSize);

        var corr = Signal.correlation(resized_chirp, cacheBuffer);
        var cliped_corr = corr.subarray(0, corr.length/2);

        console.log(
          "min", Statictics.findMin(cliped_corr), "\n",
          "max", Statictics.findMax(cliped_corr), "\n",
          "ave", Statictics.average(cliped_corr), "\n",
          "med", Statictics.median(cliped_corr), "\n",
          "var", Statictics.variance(cliped_corr), "\n"
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

      var recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
      var count = 0;
      processor.addEventListener("audioprocess", handler);

      function handler(ev: AudioProcessingEvent){
        console.log(ev)
        if(++count > 100) {
          processor.removeEventListener("audioprocess", handler);
          stream.stop();
          var pcm = recbuf.toPCM();
          //recbuf.clear();
          var wav = new Wave(recbuf.channel, actx.sampleRate, pcm);
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
        var [real, imag, spectrum] = Signal.fft(buf, actx.sampleRate);
        for(var i=0; i<spectrum.length;i++){
          spectrum[i] = spectrum[i]*20000;
        }
        if(spectrums.length > 200) spectrums.shift();
        spectrums.push(spectrum);
        if(++count%200 === 0) draw();
      }

      function draw(){
        var render = new CanvasRender(spectrums.length, spectrums[0].length);
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
        var render = new CanvasRender(spectrums.length, spectrums[0].length);
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
    var raw_chirp = Signal.createChirpSignal(Math.pow(2, 10));
    var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length/2);

    var actx = new AudioContext();
    var osc = new OSC(actx);
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
    var raw_chirp = Signal.createChirpSignal(Math.pow(2, 10));
    var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length/2);

    // noised
    var noised_chirp = new Float32Array(cliped_chirp);
    for(var i=0; i<noised_chirp.length; i++){
      noised_chirp[i] = cliped_chirp[i] + (Math.random()-1/2)*0.5;
    }

    // noised_corr
    console.time("noised_corr");
    var corr = Signal.correlation(cliped_chirp, noised_chirp);
    console.timeEnd("noised_corr");

    // draw
    var render_cliped = new CanvasRender(cliped_chirp.length, 128);
    var render_noised = new CanvasRender(noised_chirp.length, 128);
    var render_corr = new CanvasRender(corr.length, 128);
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
    Statictics.all(cliped_chirp);
    console.screenshot(render_noised.cnv);
    Statictics.all(noised_chirp);
    console.screenshot(render_corr.cnv);
    Statictics.all(corr);

    console.timeEnd("testChirp");
    console.groupEnd();
  }
}

export = Sandbox;
