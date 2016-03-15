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
import Newton from "./Newton";
import Point = Newton.Point;
import SDM = Newton.SDM;
import QRcode from "./QRcode";
import FDTD from "./FDTD";

namespace Sandbox {

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
