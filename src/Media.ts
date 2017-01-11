import {fromEvent} from "./Event";
import {copy, cnvToBlob} from "./Canvas";



export function getThumbnails(video: HTMLVideoElement, period: number): Promise<Blob[]> {
  const times: number[] = [];
  if( ! Number.isFinite(video.duration) ){
    return Promise.reject<Blob[]>(new Error("video duration is not finite"));
  }
  for(let currentTime=0; currentTime < video.duration; currentTime+=period){
    times.push(currentTime);
  }
  const thumbs = times
    .map((currentTime)=> (lst: Blob[])=> getThumbnail(video, currentTime).then((blob)=> lst.concat(blob) )  )
    .reduce<Promise<Blob[]>>((prm, genPrm)=> prm.then(genPrm), Promise.resolve([]));
  return thumbs;
}


export function loadMediaStream(opt: {audio: any, video: any}): Promise<MediaStream>{
  if(navigator.mediaDevices != null && navigator.mediaDevices.getUserMedia instanceof Function){
    console.info("use navigator.mediaDevices.getUserMedia");
    return <Promise<MediaStream>>navigator.mediaDevices.getUserMedia(opt);
  }else if(navigator.getUserMedia instanceof Function){
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


export type MediaState = "playing" | "paused" | "ended" | "seeking";
export function getMediaElementState(media: HTMLMediaElement): MediaState {
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

export const loadVideo = load_video;
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
  // MediaRecorder で録画した動画の duration が決定できないという<del>バグ</del><add>仕様</add>対策。
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
    return new Promise<HTMLVideoElement>((resolve, reject)=>{
      video.addEventListener("seeked", function listener(){
        video.removeEventListener("seeked", listener);
        resolve(video);
      });
    });
  });
}


export function getThumbnail(video: HTMLVideoElement, currentTime: number): Promise<Blob> {
  if(currentTime > video.duration){
    return Promise.reject<Blob>(new Error("currentTime is out of video duration"));
  }
  video.currentTime = currentTime;
  return fromEvent<Event>(video, "seeked")
    .then(()=> cnvToBlob(copy(video), "image/jpeg", 0.8) );
}