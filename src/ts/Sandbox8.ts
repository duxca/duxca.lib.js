/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
/// <reference path="../../tsd/qrcode-decoder-js/qrcode.d.ts"/>
/// <reference path="../../tsd/qrcodejs/qrcode.d.ts"/>

module duxca.lib.Sandbox {

  export function testQRCodeWrite(){
    var div = document.createElement("div");
    var code = new QRCode(div, "hoge");
    console.screenshot(<HTMLCanvasElement>div.children[0]);
  }

  export function testQRCodeRead(){
    new Promise<MediaStream>((resolbe, reject)=> navigator.getUserMedia({video: true, audio: false}, resolbe, reject) )
    .then((stream)=>{
      var video = document.createElement("video");
      video.src = window.URL.createObjectURL(stream);
      video.autoplay = true;
      var tid = 0;
      var render = new duxca.lib.CanvasRender(0, 0);
      return new Promise<string>((resolve, reject)=>{
        tid = setInterval(()=>{
          qrcode.width  = render.cnv.width  = video.videoWidth;
          qrcode.height = render.cnv.height = video.videoHeight;
          render.ctx.drawImage(video, 0, 0);
          qrcode.imagedata = render.ctx.getImageData(0, 0, qrcode.width, qrcode.height);
          console.clear();
          console.screenshot(render.cnv);
          try {
            var result = qrcode.process(render.ctx);
            console.log(result);
            stream.stop();
            video.pause();
            clearInterval(tid);
            resolve(Promise.resolve(result));
          } catch (e) {
            console.log("failed");
          }
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
