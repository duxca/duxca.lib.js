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

namespace Sandbox {

  export function testAudioDownload(){
    var actx = new AudioContext();
    var osc = new OSC(actx);
    osc.createAudioBufferFromURL("./TellYourWorld1min.mp3").then((abuf)=>{
      var node = osc.createAudioNodeFromAudioBuffer(abuf);
      node.start(actx.currentTime);
      node.connect(actx.destination);
    });
  }



  export function testDetect6(rootNodeId: string){
    var TEST_INPUT_MYSELF = false;
    var lastTime = 0;
    var count = 0;

    var actx = new AudioContext();
    var osc = new OSC(actx);
    var isRecording = false;
    var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
    var recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
    var render = new CanvasRender(128, 128);

    osc.createBarkerCodedChirp(13, 8).then((pulse)=>{
      render.cnv.width = 1024;
      render.drawSignal(pulse, true, true);
      console.log("length", pulse.length, "sec", pulse.length/actx.sampleRate);
      console.screenshot(render.element);
      return pulse;
    }).then((pulse)=>{
      var chord = new Chord({host:"localhost", port:9000});
      chord.debug = false;
      chord.on("ping", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        cb(token);
      });
      chord.on("startRec", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        isRecording = true;
        cb(token);
      });
      var pulseStartTime:{[id:string]: number} = {};
      chord.on("pulseStart", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var id = token.payload.data;
        pulseStartTime[token.payload.data] = actx.currentTime;
        cb(token);
      });
      var abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate);
      chord.on("pulseBeep", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var id = token.payload.data;
        if(chord.peer.id !== id) return cb(token);
        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
        var anode1 = osc.createAudioNodeFromAudioBuffer(abuf);
        anode.connect(TEST_INPUT_MYSELF?processor:actx.destination);
        lastTime = actx.currentTime;
        anode.start(actx.currentTime);
        setTimeout(()=> cb(token), pulse.length/actx.sampleRate * 1000);
      });
      var pulseStopTime:{[id:string]: number} = {};
      chord.on("pulseStop", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var id = token.payload.data;
        pulseStopTime[token.payload.data] = actx.currentTime;
        cb(token);
      });
      var calcResult:{[id:string]: number} = null;
      chord.on("stopRec", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var tmp = recbuf.count;
        (function recur(){
          if(recbuf.count === tmp) return setTimeout(recur, 100);
          isRecording = false;
          calcResult = null;
          setTimeout(()=>{
            calcResult = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
          }, 0);
          cb(token);
        })();
      });
      chord.on("collect", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        (function recur(){
          if(calcResult === null) return setTimeout(recur, 100);
          token.payload.data[chord.peer.id] = calcResult;
          cb(token);
        })();
      });
      var results:{[id:string]: number[]} = {};
      var RESULT_HISTORY_SIZE = 10;
      chord.on("distribute", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var data:{[id:string]: {[id:string]: number}} = token.payload.data;
        Object.keys(data).forEach((id1)=>{
          Object.keys(data).forEach((id2)=>{
            if(Array.isArray(results[id2+"-"+id1])){
              results[id1+"-"+id2] = results[id2+"-"+id1];
              return;
            }
            if(!Array.isArray(results[id1+"-"+id2])) results[id1+"-"+id2] = [];
            if(results[id1+"-"+id2].length > RESULT_HISTORY_SIZE) results[id1+"-"+id2].shift();
            var tmp = Math.abs(Math.abs(data[id1][id2]) - Math.abs(data[id2][id1]));
            if(isFinite(tmp)) results[id1+"-"+id2].push(tmp);
            console.log("__RES__", id1+"-"+id2, "phaseShift", tmp,
              "ave", Statictics.average(results[id1+"-"+id2]),
              "mode", Statictics.mode(results[id1+"-"+id2]),
              "med", Statictics.median(results[id1+"-"+id2]),
              "stdev", Statictics.stdev(results[id1+"-"+id2]));
          });
        });
        cb(token);
      });
      chord.on("play", (token, cb)=>{
        console.log(token.payload.event, token.payload.data);
        var masterNodeLastTime = token.payload.data;
        var id1 = token.route[0];
        var id2 = chord.peer.id;
        var delay = results[id1+"-"+id2].pop();
        console.log(id1, id2, "delay", delay);
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
          if(isRecording){
            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
          }
        });
      }).then(()=> chord);
    }).then( typeof rootNodeId === "string" ? (chord)=> void 0 : function recur(chord){
      chord.request("ping")
      .then((token)=> chord.request("startRec", null, token.route) )
      .then((token)=>
        token.payload.addressee.reduce((prm, id)=>
          prm
          .then((token)=> chord.request("pulseStart", id, token.payload.addressee))
          .then((token)=> chord.request("pulseBeep", id, token.payload.addressee))
          .then((token)=> chord.request("pulseStop", id, token.payload.addressee))
        , Promise.resolve(token) ) )
      .then((token)=> chord.request("stopRec", null, token.payload.addressee))
      .then((token)=> chord.request("collect", {}, token.payload.addressee))
      .then((token)=> chord.request("distribute", token.payload.data, token.payload.addressee))
      .then((token)=>{
        if(count++ > 10){
          console.log("play", token.payload.data, token.payload.addressee);
          chord.request("play", lastTime, token.payload.addressee);
        }else setTimeout(recur.bind(null, chord), 0);
      });
      return chord;
    });

    function calcStdscore(correlation: Float32Array):Float32Array{
      var _correlation = Signal.normalize(correlation, 100);
      var ave = Statictics.average(_correlation);
      var vari = Statictics.variance(_correlation);
      var stdscores = new Float32Array(_correlation.length);
      for(var i=0; i<_correlation.length; i++){
        stdscores[i] = 10*(_correlation[i] - ave)/vari+50;
      }
      return stdscores;
    }

    function calc(myId:string, pulse:Float32Array, pulseStartTime:{[id:string]: number}, pulseStopTime:{[id:string]: number}):{[id:string]: number}{
      var rawdata = recbuf.merge();
      var sampleTimes = recbuf.sampleTimes;
      recbuf.clear();

      var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
      var recStopTime = sampleTimes[sampleTimes.length-1];
      var results:{[id:string]: number} = {};

      render.cnv.width = 1024;
      render.cnv.height = 32;
      Object.keys(pulseStartTime).forEach((id)=>{
        var startTime = pulseStartTime[id];
        var stopTime = pulseStopTime[id];
        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
        var section = rawdata.subarray(startPtr, stopPtr);
        var corrsec = Signal.smartCorrelation(pulse, section);
        corrsec = corrsec.subarray(0, section.length);
        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
        var [max_score, max_offset] = Statictics.findMax(corrsec);
        for(var i=0; i<corrsec.length; i++){
          if(max_score/2 < corrsec[i]){
            var offset = i;
            break;
          }
        }
        results[id] = startPtr + (offset || max_offset);
        results[id] = results[id] > 0 ? results[id] : 0;
        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
        render.clear();
        render.ctx.strokeStyle = "black";
        render.drawSignal(corrsec, true, true);
        render.ctx.strokeStyle = "blue";
        render.drawColLine(offset*1024/corrsec.length);
        render.ctx.strokeStyle = "red";
        render.drawColLine(max_offset*1024/corrsec.length);
        console.log(id, "corrsec");
        console.screenshot(render.cnv);
      });

      var render1 = new CanvasRender(1024, 32);
      var render2 = new CanvasRender(1024, 32);
      var render3 = new CanvasRender(1024, 32);
      render2.drawSignal(rawdata, true, true);
      var sim = new Float32Array(rawdata.length);
      Object.keys(results).forEach((id)=>{
        if(sim.length < results[id] + pulse.length){
          sim.set(pulse.subarray(0, (results[id] + pulse.length) - sim.length));
        }else{
          sim.set(pulse, results[id]);
        }
      });
      render3.drawSignal(sim, true, true);
      var correlation = Signal.smartCorrelation(pulse, rawdata);
      correlation = correlation.subarray(0, rawdata.length);
      Object.keys(results).forEach((id)=>{
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
        render1.drawColLine(results[id]*1024/correlation.length);
        render2.drawColLine(results[id]*1024/rawdata.length);
        render3.drawColLine(results[id]*1024/sim.length);
      });
      console.log("correlation");
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

      render._drawSpectrogram(rawdata, recbuf.sampleRate);
      console.screenshot(render.cnv);

      return _results;
    }
  }
}

export = Sandbox;
