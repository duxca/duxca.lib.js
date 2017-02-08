import {fetchEvent} from "./Event";

/**
 * 
 * 
 * @param sender - xhr を書き換えつつ open と send を自分で指定します
 * @param useLocal - `file://` などで xhr.status が 0 になるものも resolve する
 * @return 200 なら resolve, その他は reject<XMLHttpRequest>
 * @example
 * ```ts
 * fetch((xhr)=>{
 *   xhr.onprogress = (ev)=>{
 *     if(!ev.lengthComputable){ return; }
 *     console.log(ev.loaded / ev.total);
 *   };
 *   xhr.open("POST", "http://example.com/");
 *   xhr.send("{foo: 0}");
 * });
 * ```
 */
export function fetch<T>(sender: (xhr: XMLHttpRequest)=> void, useLocal=false): Promise<T> {
  return new Promise<T>((resolve, reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = (ev)=>{
      if(xhr.readyState !== 4){ return; }
      if(useLocal && xhr.status === 0){ // 0 は file:// とか のとき
        if(xhr.response === null){ return reject(xhr); }
        return resolve(<T>xhr.response);
      }
      if(200 === xhr.status){ return resolve(<T>xhr.response); } // only 200
      return reject(xhr); // 1xx - Information, 3xx - Redirection, 4xx - Client Error , 5xx - Server Error
    };
    xhr.onerror = (ev)=>{ reject(xhr); };
    sender(xhr);
  });
}

/**
 * get only content-length
 */
export function fetchSize(url: string): Promise<number> {
  return fetchRange(url, 0, 0).then(({total})=> total);
}

/**
 * HTTP1.1 Range Request
 */
export function fetchRange(url: string, begin: number, end: number
): Promise<{type: string, begin: number, end: number, total: number, buffer: ArrayBuffer}> {
	const range = `${Number(begin)}-${Number(end)}`;
	return fetch((xhr)=>{
    xhr.open("GET", url);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader('Range', 'bytes='+range);
    xhr.send();
  })
  	.then(Promise.reject)
    .catch((xhr)=>{
    	if(xhr.status !== 206){ return Promise.reject(xhr); }
      const type = xhr.getResponseHeader("Content-Type") || "";
      const range = xhr.getResponseHeader("Content-Range") || "";
      const [_, b,e,t] = (/bytes (\d+)\-(\d+)\/(\d+|\*)/.exec(range)||["_", "*","*","*"]);
      const begin = Number(b);
      const end = Number(e);
      const total = Number(t);
      const buffer = xhr.response;
      return {buffer, begin, end, total, type};
    });
}


export function fetchXHR(url: string, responseType: "text", useLocal?: boolean): Promise<string>;
export function fetchXHR(url: string, responseType: "blob", useLocal?: boolean): Promise<Blob>;
export function fetchXHR(url: string, responseType: "arraybuffer", useLocal?: boolean): Promise<ArrayBuffer>;
export function fetchXHR(url: string, responseType: "document", useLocal?: boolean): Promise<Document>;
export function fetchXHR<T>(url: string, responseType: "json", useLocal?: boolean): Promise<T>;
export function fetchXHR<T>(
  url: string,
  responseType: "text" | "json" | "arraybuffer" | "blob" | "document",
  useLocal=false
): Promise<T> {
  return fetch<T>((xhr)=>{
    xhr.responseType = responseType;
    xhr.open("GET", url);
    xhr.send();
  }, useLocal);
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

