



export function loadMediaStream(opt: {audio: any, video: any}): Promise<MediaStream>{
  console.info("get user media 2592x1944");
  opt.video = {
    mandatory: {
      minWidth: 2592,
      minHeight: 1944
    }
  };
  return _loadMediaStream(opt)
  .catch(()=>{
    console.warn("fauiled. try 2048x1536");
    opt.video = {
      mandatory: {
        minWidth: 2048,
        minHeight: 1536
      }
    };
    return _loadMediaStream(opt);
  }).catch(()=>{
    console.warn("fauiled. try 640x480");
    opt.video = {
      mandatory: {
        minWidth: 640,
        minHeight: 480
      }
    };
    return _loadMediaStream(opt);
  }).catch(()=>{
    console.warn("fauiled. try 320x240");
    opt.video = {
      mandatory: {
        minWidth: 320,
        minHeight: 240
      }
    };
    return _loadMediaStream(opt);
  }).catch(()=>{
    console.warn("opt.video = true;");
    opt.video = true;
    return _loadMediaStream(opt);
  }).then((mediaStream)=>{
    console.info("getUserMedia: video option", opt.video);
    return mediaStream;
  });
}

export function _loadMediaStream(opt: {audio: any, video: any}): Promise<MediaStream>{
  if(navigator.mediaDevices != null){
    navigator.mediaDevices.enumerateDevices().then(console.log.bind(console, "navigator.mediaDevices.enumerateDevices"));
  }
  if(navigator["enumerateDevices"] instanceof Function){
    navigator["enumerateDevices"]().then(console.log.bind(console, "navigator.enumerateDevices"));
  }
  /*if(navigator.mediaDevices != null && navigator.mediaDevices.getUserMedia instanceof Function){
    console.info("use navigator.mediaDevices.getUserMedia");
    return <Promise<MediaStream>>navigator.mediaDevices.getUserMedia(opt);
  }else */if(navigator.getUserMedia instanceof Function){
    console.info("use navigator.getUserMedia");
    return new Promise((resolve, reject)=>
      navigator.getUserMedia(opt, resolve, reject) );
  }else if(navigator["webkitGetUserMedia"] instanceof Function){
    console.info("use navigator.webkitGetUserMedia");
    return new Promise((resolve, reject)=>
      navigator["webkitGetUserMedia"](opt, resolve, reject) );
  }
  alert("cannot use user media");
  return Promise.reject<MediaStream>(new Error("cannot use user media"));
}



export function getMediaElementState(media: HTMLMediaElement): "playing" | "paused" | "ended" | "seeking" {
  return media.ended   ? "ended"   :
         media.paused  ? "paused"  : 
         media.seeking ? "seeking" :
                         "playing" ;
}

export function getMediaStreamVideo(opt: {video: any, audio: any}): Promise<HTMLVideoElement> {
  return loadMediaStream(opt).then(getVideoFromMediaStream);
}

export function getVideoFromMediaStream(stream: MediaStream): Promise<HTMLVideoElement> {
  const url = URL.createObjectURL(stream);
  return load_video(url).then((video)=>{
    URL.revokeObjectURL(url);
    return video;
  });
}

export function load_video(url: string, use_bugfix=false): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.src = url;
  function load(){
    return new Promise((resolve, reject)=>{
      function loadeddata(){
        video.removeEventListener("loadeddata", loadeddata);
        video.removeEventListener("error", error);
        resolve(video);
      }
      function error(err){
        video.removeEventListener("loadeddata", loadeddata);
        video.removeEventListener("error", error);
        console.error("video load error", err);
        // ファイルが壊れてる
        reject(new Error("video load error"));
      }
      video.addEventListener("loadeddata", loadeddata);
      video.addEventListener("error", error);
    })
  }
  if(!use_bugfix){
    return load();
  }
  // http://www.marushima.info/?eid=3088
  // MediaRecorder で録画した動画の duration が決定できないというバグ対策。
  // とりあえず一週間後の時間を指定することでビデオの最後のチャンクを強制的に読み込ませる
  // Infinity はできないので。
  video.currentTime = 60*60*24*7;
  return Promise.all([
    load(),
    new Promise((resolve, reject)=>{
      setTimeout(function listener(){
        if(video.readyState === 4){
          resolve();
        }else{
          setTimeout(listener, 30);
        }
      });
    }),
    new Promise((resolve, reject)=>{
      video.addEventListener("seeked", function listener(){
        video.removeEventListener("seeked", listener);
        resolve();
      });
    }),
  ]).then(()=>{
    // 最後に currentTime を 0 に戻す
    video.currentTime = 0;
    return new Promise((resolve, reject)=>{
      video.addEventListener("seeked", function listener(){
        video.removeEventListener("seeked", listener);
        resolve(video);
      });
    });
  });
}
