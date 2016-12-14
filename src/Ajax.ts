export function fetchXHR<T>(url: string, responseType: string): Promise<T> {
  return new Promise<T>((resolve, reject)=>{
      const xhr = new XMLHttpRequest();
      const warn = (msg: string)=>{
        console.warn("fetchArrayBuffer: ", msg, xhr);
        reject(msg);
      };
      xhr.addEventListener("load", function() {
        // 0 は blob:// とか file:// とか module:// のとき
        if (xhr.status === 0 || 200 <= xhr.status && xhr.status < 300) {

          if (xhr.response.error == null) {
            resolve(<T>xhr.response);
          } else {
            warn("xhr.response.error.message: "+xhr.response.error.message);
          }
        } else {
          warn("xhr.status: "+xhr.status);
        }
      });
      xhr.addEventListener("error", function() {
        warn("xhr.response.error.message: "+xhr.response.error.message);
      });
      xhr.open("GET", url);
      xhr.responseType = responseType;
      return xhr.send();
  });
}

// XMLHttpRequest, xhr.responseType = "arraybuffer"
export function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  return fetchXHR<ArrayBuffer>(url, "arraybuffer");
}

// XMLHttpRequest, xhr.responseType = "blob"
export function fetchBlob(url: string): Promise<Blob> {
  return fetchXHR<Blob>(url, "blob");
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