/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>

module duxca.lib.Sandbox {

  navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia);

  export function testDetect7(rootNodeId: string){
    var TEST_INPUT_MYSELF = false;
    var count = 0;

    var actx = new AudioContext();
    var osc = new OSC(actx);
    var isRecording = false;
    var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
    var recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
    var render = new duxca.lib.CanvasRender(128, 128);

    osc.createBarkerCodedChirp(13, 8).then((pulse)=>{
      render.cnv.width = 1024;
      render.drawSignal(pulse, true, true);
      console.log("length", pulse.length, "sec", pulse.length/actx.sampleRate);
      console.screenshot(render.element);
      return pulse;
    }).then((pulse)=>{
      var chord = new duxca.lib.Chord();
      chord.debug = false;
      chord.on("ping", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        cb(token);
      });
      chord.on("recStart", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        isRecording = true; cb(token);
      });
      var pulseStartTime:{[id:string]: number} = {};
      chord.on("pulseStart", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var id = token.payload.data;
        pulseStartTime[id] = actx.currentTime;
        cb(token);
      });
      var abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate);
      chord.on("pulseBeep", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var id = token.payload.data;
        if(chord.peer.id !== id) return cb(token);
        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
        anode.connect(TEST_INPUT_MYSELF?processor:actx.destination);
        anode.start(actx.currentTime);
        setTimeout(()=> cb(token), pulse.length/actx.sampleRate * 1000);
      });
      var pulseStopTime:{[id:string]: number} = {};
      chord.on("pulseStop", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var id = token.payload.data;
        pulseStopTime[id] = actx.currentTime;
        cb(token);
      });
      var pulseTime:{[id:string]: number} = null;
      chord.on("recStop", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var tmp = recbuf.count;
        (function recur(){
          if(recbuf.count === tmp) return setTimeout(recur, 100); // wait audioprocess
          isRecording = false;
          pulseTime = null;
          setTimeout(()=>{
            pulseTime = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
          }, 0);
          cb(token);
        })();
      });
      chord.on("collect", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        (function recur(){
          if(pulseTime === null) return setTimeout(recur, 100); // wait calc
          token.payload.data[chord.peer.id] = pulseTime;
          cb(token);
        })();
      });
      var pulseTimes:{[id:string]:{[id:string]: number}} = null;
      var relDelayTimes:{[id:string]:{[id:string]: number}} = null;
      var delayTimesLog:{[id:string]:{[id:string]: number[]}} = {};
      chord.on("distribute", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        pulseTimes = token.payload.data;
        relDelayTimes = {};
        Object.keys(pulseTimes).forEach((id1)=>{
          Object.keys(pulseTime).forEach((id2)=>{
            relDelayTimes[id1] = relDelayTimes[id1] || {};
            relDelayTimes[id1][id2] = pulseTimes[id1][id2] - pulseTimes[id1][id1];
          });
        });
        console.log("relDelayTimes", relDelayTimes);
        Object.keys(pulseTimes).forEach((id1)=>{
          delayTimesLog[id1] = delayTimesLog[id1] || {};
          Object.keys(pulseTime).forEach((id2)=>{
            delayTimesLog[id2] = delayTimesLog[id2] || {};
            if(!Array.isArray(delayTimesLog[id1][id2])) delayTimesLog[id1][id2] = [];
            if(delayTimesLog[id1][id2].length > 10) delayTimesLog[id1][id2].shift();
            var delayTime = Math.abs(Math.abs(relDelayTimes[id1][id2]) - Math.abs(relDelayTimes[id2][id1]));
            delayTimesLog[id1][id2].push(delayTime);
            console.log("__RES__", id1, id2,
              "delayTime", delayTime,
              "distance", delayTime/2*340,
              "ave", duxca.lib.Statictics.average(delayTimesLog[id1][id2]),
              "mode", duxca.lib.Statictics.mode(delayTimesLog[id1][id2]),
              "med", duxca.lib.Statictics.median(delayTimesLog[id1][id2]),
              "stdev", duxca.lib.Statictics.stdev(delayTimesLog[id1][id2]));
          });
        });
        cb(token);
      });
      chord.on("play", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var wait = token.payload.data;
        var id1 = token.route[0];
        var id2 = chord.peer.id;
        var delay = duxca.lib.Statictics.median(delayTimesLog[id1][id2]);
        var offsetTime = pulseTimes[id2][id1] + wait + delay;
        console.log(id1, id2, "delay", delay, wait, offsetTime, pulseTimes, delayTimesLog);
        osc.createAudioBufferFromURL("./TellYourWorld1min.mp3").then((abuf)=>{
          var node = osc.createAudioNodeFromAudioBuffer(abuf);
          node.start(offsetTime);
          node.loop = true;
          node.connect(actx.destination);
        });
        cb(token);
      });
      return (typeof rootNodeId === "string") ? chord.join(rootNodeId) : chord.create();
    }).then((chord)=>{
      console.log(chord.peer.id);
      return new Promise<MediaStream>((resolbe, reject)=> navigator.getUserMedia({video: false, audio: true}, resolbe, reject) )
      .then((stream)=>{
        var source = actx.createMediaStreamSource(stream);
        !TEST_INPUT_MYSELF && source.connect(processor);
        processor.connect(actx.destination);
        processor.addEventListener("audioprocess", function handler(ev: AudioProcessingEvent){
          if(isRecording)
            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
        });
        return new Promise<Chord>((resolve, reject)=>{ setTimeout(()=>{
          resolve(Promise.resolve(chord));
        }, 1000); });
      }).then(()=> chord);
    }).then( typeof rootNodeId === "string" ? (chord)=> void 0 : function recur(chord){
      chord.request("ping")
      .then((token)=> chord.request("recStart", null, token.route) )
      .then((token)=>
        token.payload.addressee.reduce((prm, id)=>
          prm
          .then((token)=> chord.request("pulseStart", id, token.payload.addressee))
          .then((token)=> chord.request("pulseBeep", id, token.payload.addressee))
          .then((token)=> chord.request("pulseStop", id, token.payload.addressee))
        , Promise.resolve(token) ) )
      .then((token)=> chord.request("recStop", null, token.payload.addressee))
      .then((token)=> chord.request("collect", {}, token.payload.addressee))
      .then((token)=> chord.request("distribute", token.payload.data, token.payload.addressee))
      .then((token)=>{
        console.log(count, Date.now());
        if(++count === 2){
          chord.request("play", (Date.now()-token.time[0])*1.5/1000+1, token.payload.addressee).then((token)=>{
            //setTimeout(recur.bind(null, chord), 0);
          });
        }else setTimeout(recur.bind(null, chord), 0);
      });
      return chord;
    });

    function calc(myId:string, pulse:Float32Array, pulseStartTime:{[id:string]: number}, pulseStopTime:{[id:string]: number}):{[id:string]: number}{
      var rawdata = recbuf.merge();
      var sampleTimes = recbuf.sampleTimes;
      recbuf.clear();

      var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
      var recStopTime = sampleTimes[sampleTimes.length-1];
      var pulseTime:{[id:string]: number} = {};
      var pulseOffset:{[id:string]: number} = {};

      Object.keys(pulseStartTime).forEach((id)=>{
        var startTime = pulseStartTime[id];
        var stopTime = pulseStopTime[id];
        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
        var section = rawdata.subarray(startPtr, stopPtr);
        var corrsec = Signal.smartCorrelation(pulse, section);
        console.log(corrsec.length, pulse.length, section.length);
        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
        var [max_score, max_offset] = duxca.lib.Statictics.findMax(corrsec);
        var offset = -1;
        for(var i=0; i<corrsec.length; i++){
          if(max_score/2 < corrsec[i]){
            offset = i;
            pulseOffset[id] = startPtr + i;
            pulseTime[id] = (startPtr + i)/recbuf.sampleRate;
            break;
          }
        }
        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
        render.cnv.width = 1024;
        render.cnv.height = 32;
        render.ctx.strokeStyle = "black";
        render.drawSignal(corrsec, true, true);
        render.ctx.strokeStyle = "blue";
        render.drawColLine(offset*1024/corrsec.length);
        render.ctx.strokeStyle = "red";
        render.drawColLine(max_offset*1024/corrsec.length);
        console.log(id, "corrsec");
        console.screenshot(render.cnv);
      });

      var render1 = new duxca.lib.CanvasRender(1024, 32);
      var render2 = new duxca.lib.CanvasRender(1024, 32);
      var render3 = new duxca.lib.CanvasRender(1024, 32);
      render2.drawSignal(rawdata, true, true);
      var sim = new Float32Array(rawdata.length);
      Object.keys(pulseOffset).forEach((id)=>{
        if(sim.length < pulseOffset[id] + pulse.length){
          sim.set(pulse.subarray(0, (pulseOffset[id] + pulse.length) - sim.length), pulseTime[id]);
        }else sim.set(pulse, pulseOffset[id]);
      });
      render3.drawSignal(sim, true, true);
      var correlation = duxca.lib.Signal.smartCorrelation(pulse, rawdata);
      console.log(correlation.length, pulse.length, rawdata.length);
      Object.keys(pulseOffset).forEach((id)=>{
        var startTime = pulseStartTime[id];
        var stopTime = pulseStopTime[id];
        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
        render1.ctx.strokeStyle = "blue";
        render2.ctx.strokeStyle = "blue";
        render3.ctx.strokeStyle = "blue";
        render1.drawColLine(startPtr*1024/correlation.length);
        render1.drawColLine(stopPtr*1024/correlation.length);
        render2.drawColLine(startPtr*1024/rawdata.length);
        render2.drawColLine(stopPtr*1024/rawdata.length);
        render3.drawColLine(startPtr*1024/sim.length);
        render3.drawColLine(stopPtr*1024/sim.length);
        render1.ctx.strokeStyle = "red";
        render2.ctx.strokeStyle = "red";
        render3.ctx.strokeStyle = "red";
        render1.drawColLine(pulseOffset[id]*1024/correlation.length);
        render2.drawColLine(pulseOffset[id]*1024/rawdata.length);
        render3.drawColLine(pulseOffset[id]*1024/sim.length);
      });
      console.log("correlation");
      console.screenshot(render1.cnv);
      console.log("rawdata");
      console.screenshot(render2.cnv);
      console.log("sim");
      console.screenshot(render3.cnv);
      console.log("pulseOffset", pulseOffset);
      console.log("pulseTime", pulseTime);

      render._drawSpectrogram(rawdata, recbuf.sampleRate);
      console.screenshot(render.cnv);

      return pulseTime;
    }
  }
}
