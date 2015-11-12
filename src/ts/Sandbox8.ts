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
import Newton = require("./Newton");
import Point = Newton.Point;
import SDM = Newton.SDM;
import QRcode = require("./QRcode");
import FDTD = require("./FDTD");

namespace Sandbox {


  export function testNext(){

  }

  export function testQRCodeWrite(){
    console.screenshot(QRcode.writer("hoge"));
  }


  export function testQRCodeRead(){
    new Promise<MediaStream>((resolbe, reject)=> navigator.getUserMedia({video: true, audio: false}, resolbe, reject) )
    .then((stream)=>{
      var video = document.createElement("video");
      video.src = window.URL.createObjectURL(stream);
      video.autoplay = true;
      var tid = 0;
      var render = new CanvasRender(0, 0);
      return new Promise<string>((resolve, reject)=>{
        tid = setInterval(()=>{
          render.cnv.width  = video.videoWidth;
          render.cnv.height = video.videoHeight;
          render.ctx.drawImage(video, 0, 0);
          console.clear();
          console.screenshot(render.cnv);
          QRcode.reader(render.cnv, render.ctx).then((result)=>{
            stream.stop();
            video.pause();
            clearInterval(tid);
            resolve(Promise.resolve(result));
          }).catch((err)=>{
            console.log("failed");
          });
        }, 1000);
      });
    })
    .then((data)=>{
      console.log(data);
    });
  }


  export function testFDTD(){
    var render = new CanvasRender(100, 100);
    var fdtd = new FDTD(100, 100);
    var counter = 0;
    fdtd.pressures[0][1024] = 1024;
    function recur(){
      fdtd.step();
      fdtd.draw(render);
      console.log(counter);
      console.log(fdtd);
      console.screenshot(render.cnv);
      if(counter++ < 1000){
        setTimeout(recur, 1000/30);
      }
    }
    recur();
  }
}

export = Sandbox;
