/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>

module duxca.lib.Sandbox2 {

  navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia);

  export function _(id?:string): void{
    var data = [
      {id:"a",data:{a: 0, b: 1, c: 2}},
      {id:"b",data:{a: 1, b: 0, c: 1}},
      {id:"c",data:{a: 2, b: 1, c: 0}}
    ];
    for(var i=0;i<3;i++)
      for(var j=i+1;j<3;j++)
        console.log(i, j, i+"["+i+"~"+j+"]");
  }

  export function testAutoDetect3(id?:string): void{
    var TEST_INPUT_MYSELF = false;

    var actx = new AudioContext();
    var codeA = duxca.lib.Signal.createBarkerCode(13);
    var pulseA = createPulse(codeA, 6);
    console.log(actx.sampleRate, pulseA.length, pulseA.length/actx.sampleRate);

    var render = new duxca.lib.CanvasRender(128, 128);
    render.cnv.width = pulseA.length;
    render.drawSignal(pulseA, true, true);
    console.screenshot(render.element);

    var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
    var recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
    var isRecording = false;
    var stdscoreResult:{[id:string]: number} = null;
    var pulseReady:{[id:string]: number} = {};
    var pulseFinish:{[id:string]: number} = {};
    var results:{[id:string]: number[]} = {};

    Promise.resolve()
    .then(setupRecording)
    .then(setupChord)
    .then((chd)=>{
      console.log(chd.peer.id);
      if(typeof id !== "string"){
        // master node
        setTimeout(function recur(){
          chd.request("ping")
          .then((token)=>{
            console.log(token.payload.event, token.route);
            var member = token.route;
            return chd.request("startRec", {member})
            .then((token)=>
              token.route.reduce((prm, id)=>
                prm
                .then((token)=> chd.request("pulseStart", {member, id}))
                .then((token)=> chd.request("pulseBeep", {member, id}))
                .then((token)=> chd.request("pulseStop", {member, id}))
              , Promise.resolve(token) ) )
            .then((token)=> chd.request("stopRec", {member, id}))
            .then((token)=> chd.request("calc", {member, id}))
            .then((token)=> chd.request("collect", {member, data:[]}))
            .then((token)=>{
              console.log(token.payload.event, token.route, token.payload.data);
              var data:{id:string, stdscoreResult:{[id:string]: number}}[] = token.payload.data.data;
              data.forEach(({id:id1}, i)=>{
                data.forEach(({id:id2}, j)=>{
                  if(!Array.isArray(results[id1+"-"+id2])) results[id1+"-"+id2] = [];
                  if(results[id1+"-"+id2].length > 20) results[id1+"-"+id2].shift();
                  var tmp = Math.abs(Math.abs(data[i].stdscoreResult[id2]) - Math.abs(data[j].stdscoreResult[id1]));
                  if(isFinite(tmp)) results[id1+"-"+id2].push(tmp);
                  console.log("__RES__", id1+"-"+id2, duxca.lib.Statictics.median(results[id1+"-"+id2])*170);
                });
              });
              setTimeout(()=>recur(), 1000);
            });
          })
          .catch((err)=> console.error(err));
        }, 1000);
      }
      console.log("ready.");
    });

    function setupChord(){
      var chd = new duxca.lib.Chord();
      var osc = new duxca.lib.OSC(actx);
      var abufA = osc.createAudioBufferFromArrayBuffer(pulseA, 44100);
      chd.debug = false;
      chd.on("ping", (token, cb)=>{
        console.log(token.payload.event);
        cb(token); });
      chd.on("startRec", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event);
        isRecording = true;
        cb(token); });
      chd.on("pulseStart", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event, token.payload.data);
        pulseReady[token.payload.data.id] = actx.currentTime;
        cb(token); });
      chd.on("pulseBeep", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event, token.payload.data);
        if(token.payload.data.id !== chd.peer.id) return cb(token);
        var anodeA = osc.createAudioNodeFromAudioBuffer(abufA);
        anodeA.connect(TEST_INPUT_MYSELF?processor:actx.destination);
        anodeA.start(actx.currentTime + 0.05);
        setTimeout(()=> cb(token), 300); });
      chd.on("pulseStop", (token, cb)=>{
        console.log(token.payload.data.member, token.payload.data.member.indexOf(chd.peer.id));
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event, token.payload.data);
        pulseFinish[token.payload.data.id] = actx.currentTime;
        cb(token); });
      chd.on("stopRec", (token, cb)=>{
        console.log(token.payload.data.member, token.payload.data.member.indexOf(chd.peer.id));
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event);
        isRecording = false;
        cb(token); });
      chd.on("calc", (token, cb)=>{
        console.log(token.payload.data.member, token.payload.data.member.indexOf(chd.peer.id));
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event);
        stdscoreResult = null;
        cb(token);
        setTimeout(()=> stdscoreResult = calc(chd.peer.id), 100);
      });
      chd.on("collect", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event, token.payload.data);
        (function recur(){
          if(stdscoreResult !== null){
            token.payload.data.data.push({id: chd.peer.id, stdscoreResult});
            cb(token);
          }else setTimeout(recur, 0);
        })();
      });
      return (typeof id === "string") ? chd.join(id) : chd.create();
    }

    function setupRecording(){
      return new Promise<MediaStream>((resolbe, reject)=> navigator.getUserMedia({video: false, audio: true}, resolbe, reject) )
      .then((stream)=>{
        var source = actx.createMediaStreamSource(stream);
        !TEST_INPUT_MYSELF && source.connect(processor);
        processor.connect(actx.destination);
        processor.addEventListener("audioprocess", function handler(ev: AudioProcessingEvent){
          if(isRecording){
            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
          }
        });
      })
    }

    function createPulse(code:number[], length:number): Float32Array{
      var chirp = duxca.lib.Signal.createCodedChirp(code, length);
      for(var pow=0; chirp.length > Math.pow(2, pow); pow++); // ajasting power of two for FFT
      var pulse = new Float32Array(Math.pow(2, pow));
      pulse.set(chirp, 0);
      return pulse;
    }

    function calcCorr(pulse:Float32Array, rawdata:Float32Array):Float32Array{
      var windowsize = pulse.length;
      var resized_pulse = new Float32Array(windowsize*2); // for overwrap adding way correlation
      resized_pulse.set(pulse, 0);
      var buffer = new Float32Array(windowsize*2); // for overwrap adding way correlation
      var correlation = new Float32Array(rawdata.length);
      for(var i=0; rawdata.length - (i+windowsize) >= resized_pulse.length; i+=windowsize){
        buffer.set(rawdata.subarray(i, i+windowsize), 0);
        var corr = duxca.lib.Signal.correlation(buffer, resized_pulse);
        for(var j=0; j<corr.length; j++){
          correlation[i+j] = corr[j];
        }
      }
      return correlation;
    }

    function calcStdscore(correlation: Float32Array):Float32Array{
      var _correlation = duxca.lib.Signal.normalize(correlation, 100);
      var ave = duxca.lib.Statictics.average(_correlation);
      var vari = duxca.lib.Statictics.variance(_correlation);
      var stdscores = new Float32Array(_correlation.length);
      for(var i=0; i<_correlation.length; i++){
        stdscores[i] = 10*(_correlation[i] - ave)/vari+50;
      }
      return stdscores;
    }

    function calc(myId:string){
      console.log(recbuf);
      var rawdata = recbuf.merge();
      var sampleTimes = recbuf.sampleTimes;
      recbuf.clear();

      console.group("calc correlation");
      console.time("calc correlation");
      var correlationA = calcCorr(pulseA, rawdata);
      console.timeEnd("calc correlation");
      console.groupEnd();

      console.group("calc stdscore");
      console.time("calc stdscore");
      var stdscoresA = calcStdscore(correlationA);
      console.timeEnd("calc stdscore");
      console.groupEnd();

      console.group("calc cycle");
      console.time("calc cycle");
      var recStartTime = sampleTimes[0] - recbuf.bufferSize / recbuf.sampleRate;
      var recStopTime = sampleTimes[sampleTimes.length-1];
      var results:{[id:string]: number} = {};

      var render = new duxca.lib.CanvasRender(1024, 32);
      Object.keys(pulseReady).forEach((id)=>{
        var startTime = pulseReady[id];
        var stopTime = pulseFinish[id];
        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
        var sectionA = correlationA.subarray(startPtr, stopPtr);
        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", sectionA.length);
        var stdsectionA = calcStdscore(sectionA);
        var [max_score, max_offset] = duxca.lib.Statictics.findMax(stdsectionA);
        for(var i=0; i<1024; i++){
          if(stdsectionA[max_offset - 2048/2 + i]>70){
            var offset = max_offset - 2048/2 + i;
            break;
          }
        }
        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", stdsectionA[offset], "globalOffset", startPtr + offset);
        results[id] = startPtr + offset;
        render.clear();
        render.ctx.strokeStyle = "black";
        render.drawSignal(sectionA, true, true);
        render.ctx.strokeStyle = "red";
        render.drawColLine(offset*1024/sectionA.length);
        console.log(id, "section");
        console.screenshot(render.cnv);
      });

      var render1 = new duxca.lib.CanvasRender(1024, 32);
      var render2 = new duxca.lib.CanvasRender(1024, 32);
      var render3 = new duxca.lib.CanvasRender(1024, 32);
      render1.drawSignal(stdscoresA, true, true);
      render2.drawSignal(rawdata, true, true);
      var tmp = new Float32Array(rawdata.length);
      Object.keys(results).forEach((id)=>{ tmp.set(pulseA, results[id]); });
      render3.drawSignal(tmp, true, true);
      Object.keys(results).forEach((id)=>{
        var startTime = pulseReady[id];
        var stopTime = pulseFinish[id];
        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
        render1.ctx.strokeStyle = "blue";
        render2.ctx.strokeStyle = "blue";
        render3.ctx.strokeStyle = "blue";
        render1.drawColLine(startPtr*1024/stdscoresA.length);
        render1.drawColLine(stopPtr*1024/stdscoresA.length);
        render2.drawColLine(startPtr*1024/stdscoresA.length);
        render2.drawColLine(stopPtr*1024/stdscoresA.length);
        render3.drawColLine(startPtr*1024/stdscoresA.length);
        render3.drawColLine(stopPtr*1024/stdscoresA.length);
        render1.ctx.strokeStyle = "red";
        render2.ctx.strokeStyle = "red";
        render3.ctx.strokeStyle = "red";
        render1.drawColLine(results[id]*1024/stdscoresA.length);
        render2.drawColLine(results[id]*1024/stdscoresA.length);
        render3.drawColLine(results[id]*1024/stdscoresA.length);
      });
      console.log("stdscores");
      console.screenshot(render1.cnv);
      console.log("rawdata");
      console.screenshot(render2.cnv);
      console.log("sim");
      console.screenshot(render3.cnv);
      console.log("results", results);
      var _results: {[id:string]: number} = {};
      Object.keys(results).forEach((id)=>{
        _results[id] = (results[id] - results[myId])/recbuf.sampleRate;
      });
      console.log("results", _results);
      console.timeEnd("calc cycle");
      console.groupEnd();

      console.group("show spectrogram");
      console.time("show spectrogram");
      var render = new duxca.lib.CanvasRender(128, 128);
      var windowsize = Math.pow(2, 8); // spectrgram height
      var slidewidth = Math.pow(2, 5); // spectrgram width rate
      var sampleRate = recbuf.sampleRate;
      console.log(
        "sampleRate:", sampleRate, "\n",
        "windowsize:", windowsize, "\n",
        "slidewidth:", slidewidth, "\n",
        "windowsize(ms):", windowsize/sampleRate*1000, "\n",
        "slidewidth(ms):", slidewidth/sampleRate*1000, "\n"
      );
      var spectrums: Float32Array[] = [];
      for(var ptr=0; ptr+windowsize < rawdata.length; ptr += slidewidth){
        var buffer = rawdata.subarray(ptr, ptr+windowsize);
        if(buffer.length!==windowsize) break;
        var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
        for(var i=0; i<spectrum.length;i++){
          spectrum[i] = spectrum[i]*20000;
        }
        spectrums.push(spectrum);
      }
      console.log(
        "ptr", 0+"-"+(ptr-1)+"/"+rawdata.length,
        "ms", 0/sampleRate*1000+"-"+(ptr-1)/sampleRate*1000+"/"+rawdata.length*1000/sampleRate,
        spectrums.length+"x"+spectrums[0].length
      );
      render.cnv.width = spectrums.length;
      render.cnv.height = spectrums[0].length;
      render.drawSpectrogram(spectrums);
      console.screenshot(render.cnv);
      console.timeEnd("show spectrogram");
      console.groupEnd();

      return _results;
    }




  }





  export function testAutoDetect2(id?:string): void{
    var PULSE_INTERVAL_SEC = 0.5;
    var PULSE_REFRAIN = 1;
    var CUTOFF_STANDARDSCORE = 100;
    var TEST_INPUT_MYSELF = false;

    var actx = new AudioContext();
    var codeA = duxca.lib.Signal.createBarkerCode(1);
    var pulseA = createPulse(codeA, 12);
    console.log(actx.sampleRate, pulseA.length, pulseA.length/actx.sampleRate);

    var render = new duxca.lib.CanvasRender(128, 128);
    render.cnv.width = pulseA.length;
    render.drawSignal(pulseA, true, true);
    console.screenshot(render.element);

    var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
    var recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
    var isRecording = false;
    var stdscoreResult:{[id:string]: number} = null;
    var pulseReady:{[id:string]: number} = {};
    var pulseFinish:{[id:string]: number} = {};

    Promise.resolve()
    .then(setupRecording)
    .then(setupChord)
    .then((chd)=>{
      console.log(chd.peer.id);
      if(typeof id !== "string"){
        // master node
        setTimeout(function recur(){
          chd.request("ping")
          .then((token)=>{
            console.log(token.payload.event, token.route);
            return chd.request("startRec", {member: token.route});
          })
          .then((token)=>{
            console.log(token.payload.event, token.route);
            return token.route.reduce((prm, id)=>
              prm
              .then((token)=> chd.request("pulseStart", {member: token.route, id}))
              .then((token)=> chd.request("pulseBeep", {member: token.route, id}))
              .then((token)=> chd.request("pulseStop", {member: token.route, id}))
            , Promise.resolve(token) );
          })
          .then((token)=> chd.request("stopRec", {member: token.route, id}))
          .then((token)=> chd.request("calc", {member: token.route, id}))
          .then((token)=> chd.request("collect", {member: token.route, data:[]}))
          .then((token)=>{
            console.log(token.payload.event, token.route, token.payload.data);
            var data:{id:string, stdscoreResult:{[id:string]: number}}[] = token.payload.data.data;
            data.forEach(({id:id1}, i)=>{
              data.forEach(({id:id2}, j)=>{
                console.log(id1, id2, Math.abs(Math.abs(data[i].stdscoreResult[id2])-Math.abs(data[j].stdscoreResult[id1])))
              });
            });
            setTimeout(()=>recur(), 1000);
          })
          .catch((err)=> console.error(err));
        }, 1000);
      }
      console.log("ready.");
    });

    function setupChord(){
      var chd = new duxca.lib.Chord();
      var osc = new duxca.lib.OSC(actx);
      var abufA = osc.createAudioBufferFromArrayBuffer(pulseA, actx.sampleRate);
      chd.debug = false;
      chd.on("ping", (token, cb)=>{
        console.log(token.payload.event); cb(token); });
      chd.on("startRec", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event); isRecording = true; cb(token); });
      chd.on("pulseStart", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event, token.payload.data);
        pulseReady[token.payload.data.id] = actx.currentTime;
        setTimeout(()=> cb(token), 0);
      });
      chd.on("pulseBeep", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event, token.payload.data);
        if(token.payload.data.id !== chd.peer.id) return cb(token);
        var offsetTime = actx.currentTime + 0.1;
        for(var i=0; i<PULSE_REFRAIN; i++){
          var anode = osc.createAudioNodeFromAudioBuffer(abufA);
          anode.connect(TEST_INPUT_MYSELF?processor:actx.destination);
          anode.start(offsetTime + PULSE_INTERVAL_SEC*i);
        }
        setTimeout(()=> cb(token), PULSE_REFRAIN * PULSE_INTERVAL_SEC * 1000 + 100);
      });
      chd.on("pulseStop", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event, token.payload.data);
        pulseFinish[token.payload.data.id] = actx.currentTime;
        setTimeout(()=> cb(token), 0);
      });
      chd.on("stopRec", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event); isRecording = false; cb(token); });
      chd.on("calc", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event);
        cb(token);
        stdscoreResult = null;
        setTimeout(()=> stdscoreResult = calc(chd.peer.id), 100);
      });
      chd.on("collect", (token, cb)=>{
        if(token.payload.data.member.indexOf(chd.peer.id)<0) return cb(token);
        console.log(token.payload.event, token.payload.data);
        (function recur(){
          if(stdscoreResult !== null){
            token.payload.data.data.push({id: chd.peer.id, stdscoreResult});
            cb(token);
          }else setTimeout(recur, 500);
        })();
      });
      return (typeof id === "string") ? chd.join(id) : chd.create();
    }

    function setupRecording(){
      return new Promise<MediaStream>((resolbe, reject)=> navigator.getUserMedia({video: false, audio: true}, resolbe, reject) )
      .then((stream)=>{
        var source = actx.createMediaStreamSource(stream);
        !TEST_INPUT_MYSELF && source.connect(processor);
        processor.connect(actx.destination);
        processor.addEventListener("audioprocess", function handler(ev: AudioProcessingEvent){
          if(isRecording){
            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
          }
        });
      })
    }

    function createPulse(code:number[], length:number): Float32Array{
      var chirp = duxca.lib.Signal.createCodedChirp(code, length);
      for(var pow=0; chirp.length > Math.pow(2, pow); pow++); // ajasting power of two for FFT
      var pulse = new Float32Array(Math.pow(2, pow));
      pulse.set(chirp, 0);
      return pulse;
    }

    function calcCorr(pulse:Float32Array, rawdata:Float32Array):Float32Array{
      var windowsize = pulse.length;
      var resized_pulse = new Float32Array(windowsize*2); // for overwrap adding way correlation
      resized_pulse.set(pulse, 0);
      var buffer = new Float32Array(windowsize*2); // for overwrap adding way correlation
      var correlation = new Float32Array(rawdata.length);
      for(var i=0; rawdata.length - (i+windowsize) >= resized_pulse.length; i+=windowsize){
        buffer.set(rawdata.subarray(i, i+windowsize), 0);
        var corr = duxca.lib.Signal.correlation(buffer, resized_pulse);
        for(var j=0; j<corr.length; j++){
          correlation[i+j] = corr[j];
        }
      }
      return correlation;
    }

    function calcStdscore(correlation: Float32Array):Float32Array{
      var _correlation = duxca.lib.Signal.normalize(correlation, 100);
      var ave = duxca.lib.Statictics.average(_correlation);
      var vari = duxca.lib.Statictics.variance(_correlation);
      console.log(
        "ave:", ave, "\n",
        "med:", duxca.lib.Statictics.median(_correlation), "\n",
        "var:", vari, "\n"
      );
      var stdscores = new Float32Array(_correlation.length);
      for(var i=0; i<_correlation.length; i++){
        stdscores[i] = 10*(_correlation[i] - ave)/vari+50;
      }
      return stdscores;
    }

    function calc(myId:string){
      var rawdata = recbuf.merge();
      var sampleTimes = recbuf.sampleTimes;
      recbuf.clear();

      console.group("calc correlation");
      console.time("calc correlation");
      var correlationA = calcCorr(pulseA, rawdata);
      var correlation = new Float32Array(correlationA.length);
      for(var i=0; i<correlation.length; i++){
        correlation[i] = correlationA[i];
      }
      console.timeEnd("calc correlation");
      console.groupEnd();


      console.group("calc stdscore");
      console.time("calc stdscore");
      var stdscores = calcStdscore(correlation);
      console.timeEnd("calc stdscore");
      console.groupEnd();

      console.group("calc cycle");
      console.time("calc cycle");
      var results:{[id:string]: number} = {};
      Object.keys(pulseReady).forEach((id)=>{
        console.log(id);
        console.log(recbuf.bufferSize / recbuf.sampleRate);
        var recStartTime = sampleTimes[0] - recbuf.bufferSize / recbuf.sampleRate;
        var recStopTime = sampleTimes[sampleTimes.length-1];
        var startTime = pulseReady[id];
        var stopTime = pulseFinish[id];
        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
        console.log("startPtr", startPtr, "stopPtr", stopPtr);

        var section = stdscores.subarray(startPtr, stopPtr);
        var _section = duxca.lib.Signal.normalize(section, 128); // _** for draw
        var splitsize = PULSE_INTERVAL_SEC*recbuf.sampleRate;
        console.log("splitsize",splitsize);
        var sumarr = new Float32Array(splitsize);
        var offsets:number[] = [];
        var render = new duxca.lib.CanvasRender(128, 128);
        for(var i=0; i<_section.length; i+=splitsize){
          var part = section.subarray(i, i+splitsize);
          var _part = _section.subarray(i, i+splitsize);
          var [max_score, offset] = duxca.lib.Statictics.findMax(part);
          if(max_score > CUTOFF_STANDARDSCORE){
            offsets.push(offset);
          }

          console.log("part", "total_offset", i+offset, "local_offset", offset, "stdscore", max_score);
          render.cnv.width = 1024//_part.length;
          render.ctx.strokeStyle = "black";
          render.drawSignal(_part, true, false);
          render.ctx.strokeStyle = max_score > CUTOFF_STANDARDSCORE ? "red" : "blue";
          render.drawColLine(offset*1024/sumarr.length);
          console.screenshot(render.cnv);

          if(sumarr.length === part.length){
            for(var j=0; j<part.length; j++){
              sumarr[j] += part[j];
            }
          }
        }

        console.log("phaseshifts", offsets);
        var ave = duxca.lib.Statictics.average(offsets);
        var med = duxca.lib.Statictics.median(offsets);
        var mode = duxca.lib.Statictics.mode(offsets);
        var [max_score, offset] = duxca.lib.Statictics.findMax(sumarr);
        console.log(
          "min", duxca.lib.Statictics.findMin(offsets)[0], "\n",
          "max", duxca.lib.Statictics.findMax(offsets)[0], "\n",
          "ave", ave, "red", "\n",
          "med", med, "green", "\n",
          "mode", mode, "blue", "\n",
          "sum", offset, "yellow", "\n",
          "stdev", duxca.lib.Statictics.stdev(offsets)
        );
        console.log("sum", "stdscore", max_score, "global_offset", startPtr + offset);
        // global_offset this is bad. because startPtr is time of pulseStart event.
        // i need pulseBeep event time. so this program does not work.
        results[id] = startPtr + offset;
        render.cnv.width = 1024//sumarr.length;
        render.ctx.strokeStyle = "gray";
        render.drawSignal(sumarr, true, true);
        render.ctx.strokeStyle = "red";
        render.drawColLine(ave*1024/sumarr.length);
        render.ctx.strokeStyle = "green";
        render.drawColLine(med*1024/sumarr.length);
        render.ctx.strokeStyle = "blue";
        render.drawColLine(mode*1024/sumarr.length);
        render.ctx.strokeStyle = "yellow";
        render.drawColLine(offset*1024/sumarr.length);
        console.screenshot(render.cnv);
        console.timeEnd("calc cycle");
        console.groupEnd();
      });

      console.group("show spectrogram");
      console.time("show spectrogram");
      var render = new duxca.lib.CanvasRender(128, 128);
      var windowsize = Math.pow(2, 8); // spectrgram height
      var slidewidth = Math.pow(2, 5); // spectrgram width rate
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
      recur();

      function recur(){
        if(ptr+windowsize > rawdata.length){
          console.timeEnd("show spectrogram");
          console.groupEnd();
          return;
        }
        for(var j=0; j<PULSE_INTERVAL_SEC*sampleRate/slidewidth; j++){
          var buffer = rawdata.subarray(ptr, ptr+windowsize);
          if(buffer.length!==windowsize) break;
          var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
          for(var i=0; i<spectrum.length;i++){
            spectrum[i] = spectrum[i]*20000;
          }
          spectrums.push(spectrum);
          ptr += slidewidth;
        }
        draw();
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
      var _results = results;
      Object.keys(results).forEach((id)=>{
        _results[id] = results[myId] - results[id]
      });
      return _results;
    }
  }

}
