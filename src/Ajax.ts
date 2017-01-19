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
        console.warn("fetchXHR: ", xhr, xhr.status);
        reject(xhr.status);
      }
    });
    xhr.addEventListener("error", function(err) {
      console.warn("fetchXHR: ", xhr, xhr.status, err);
      reject(err.error);
    });
    xhr.open("GET", url);
    xhr.responseType = responseType;
    return xhr.send();
  });
}

// XMLHttpRequest, xhr.responseType = "arraybuffer"
export function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  return fetchXHR(url, "arraybuffer");
}

// XMLHttpRequest, xhr.responseType = "blob"
export function fetchBlob(url: string): Promise<Blob> {
  return fetchXHR(url, "blob");
}

export function getArrayBuffer(url: string): Promise<ArrayBuffer> {
  console.warn("getArrayBuffer is deprecated");
  return fetchArrayBuffer(url);
}

// URL -> HTMLImageElement
export function fetchImageFromURL(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject)=>{
    const img = new Image();
    img.src = url;
    img.addEventListener("load", function _listener() {
      img.removeEventListener("load", _listener);
      resolve(img);
    });
    img.addEventListener("error", function _listener(ev) {
      img.removeEventListener("error", _listener);
      console.error("fetchImageFromURL:", ev);
      reject(ev.error);
    });
  });
}


export function loadScript(url: string): Promise<Event> {
  var script = document.createElement("script");
  script.src = url;
  document.body.appendChild(script);
  return new Promise((resolve)=>{
    script.onload = resolve;
  })
}