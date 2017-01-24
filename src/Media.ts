import {fetchEvent} from "./Event";
import {copy, toBlob} from "./Canvas";
import {readAsDataURL} from "./Blob";

export type MediaState = "playing" | "paused" | "ended" | "seeking";
export function getState(media: HTMLMediaElement): MediaState {
  return media.ended   ? "ended"   :
         media.paused  ? "paused"  : 
         media.seeking ? "seeking" :
                         "playing" ;
}

export function fetchThumbnailAsBlob(video: HTMLVideoElement, currentTime: number): Promise<Blob> {
  if(currentTime > video.duration){
    return Promise.reject<Blob>(new Error("currentTime is out of video duration"));
  }
  return seekTo(video, currentTime)
    .then(copy)
    .then((cnv)=> toBlob(cnv, "image/jpeg", 0.8) );
}

export function fetchThumbnailAsDataURL(video: HTMLVideoElement, currentTime: number): Promise<string> {
  return fetchThumbnailAsBlob(video, currentTime).then(readAsDataURL);
}

export function seekTo<M extends HTMLMediaElement>(media: M, currentTime: number): Promise<M> {
  media.currentTime = currentTime;
  return fetchEvent(media, "seeked").then(()=> media);
}

export function fetchMediaStream(opt: MediaStreamConstraints): Promise<MediaStream>{
  let getUserMedia: any = null;
  if(navigator.mediaDevices != null){
    getUserMedia = navigator.mediaDevices.getUserMedia
                || navigator.mediaDevices["webkitGetUserMedia"]
                || navigator.mediaDevices["mozGetUserMedia"]
                || navigator.mediaDevices["msGetUserMedia"];
  }
  if(getUserMedia != null){
    return getUserMedia.call(navigator.mediaDevices, opt);
  }
  getUserMedia = navigator.getUserMedia
              || navigator["webkitGetUserMedia"]
              || navigator["mozGetUserMedia"]
              || navigator["msGetUserMedia"];
  return new Promise(getUserMedia.bind(navigator, opt));
}
