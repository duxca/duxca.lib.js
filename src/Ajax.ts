import {fetchEvent} from "./Event";

export function fetchXHR(url: string, responseType: "text"): Promise<string>;
export function fetchXHR(url: string, responseType: "blob"): Promise<Blob>;
export function fetchXHR(url: string, responseType: "arraybuffer"): Promise<ArrayBuffer>;
export function fetchXHR(url: string, responseType: "document"): Promise<Document>;
export function fetchXHR<T>(url: string, responseType: "json"): Promise<T>;
export function fetchXHR<T>(url: string, responseType: "text" | "json" | "arraybuffer" | "blob" | "document"): Promise<T> {
  return new Promise<T>((resolve, reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", ()=>{
      // 0 は blob:// とか file:// とか module:// のとき
      if (xhr.status === 0 || 200 <= xhr.status && xhr.status < 300) {
        resolve(<T>xhr.response);
      } else {
        reject(xhr);
      }
    });
    xhr.addEventListener("error", function(ev: ProgressEvent) {
      reject(xhr);
    });
    xhr.open("GET", url);
    xhr.responseType = responseType;
    return xhr.send();
  });
}

export function fetchText<T>(url: string): Promise<string> {
  return fetchXHR(url, "text");
}

export function fetchDocument<T>(url: string): Promise<Document> {
  return fetchXHR(url, "document");
}

export function fetchJSON<T>(url: string): Promise<T> {
  return fetchXHR<T>(url, "json");
}

export function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  return fetchXHR(url, "arraybuffer");
}

export function fetchBlob(url: string): Promise<Blob> {
  return fetchXHR(url, "blob");
}

export function fetchImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  return fetchEvent(img, "load", "error").then(()=> img);
}

export function fetchScript(url: string): Promise<Event> {
  const script = document.createElement("script");
  script.src = url;
  document.head.appendChild(script);
  return fetchEvent(script, "load", "error");
}

/**
 * force: URL.revokeObjectURL
 */
export function fetchBlobURL<T>(fetch: (url: string)=> Promise<T>, blob: Blob): Promise<T>{
  const url = URL.createObjectURL(blob);
  return fetch(url).then((o)=>{
    URL.revokeObjectURL(url);
    return o;
  });
}

export function fetchAudio(url: string, try_to_get_duration=false): Promise<HTMLAudioElement> {
  return fetchMedia("audio", url, try_to_get_duration);
}

export function fetchVideo(url: string, try_to_get_duration=false): Promise<HTMLVideoElement> {
  return fetchMedia("video", url, try_to_get_duration);
}

function fetchMedia(type: "video" | "audio", url: string, try_to_get_duration=false): Promise<HTMLMediaElement> {
  const media = document.createElement(type);
  media.src = url;
  if(!try_to_get_duration){
    return fetchEvent(media, "loadeddata", "error").then(()=> media);
  }
  // http://www.marushima.info/?eid=3088
  // MediaRecorder で録画した動画の duration が決定できないという<del>バグ</del><add>仕様</add>対策。
  // とりあえず一週間後の時間を指定することでビデオの最後のチャンクを強制的に読み込ませる
  // Infinity はできないので。
  media.currentTime = 60*60*24*7;
  return Promise.all([
    fetchEvent(media, "loadeddata", "error"),
    fetchEvent(media, "seeked", "error")
  ])
    .then(()=>{
      // 最後に currentTime を 0 に戻す
      media.currentTime = 0;
      return fetchEvent(media, "seeked", "error");
    })
    .then(()=> media);
}

