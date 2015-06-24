/// <reference path="../../typings/tsd.d.ts" />

module duxca.lib.Ajax {

  export function getArrayBuffer(url: string): Promise<ArrayBuffer> {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.addEventListener("load", function() {
        if (200 <= xhr.status && xhr.status < 300) {
          if (xhr.response.error == null) {
            return resolve(xhr.response);
          } else {
            return reject(new Error("message: "+ xhr.response.error.message));
          }
        } else {
          return reject(new Error("status: "+xhr.status));
        }
      });
      xhr["open"]("GET", url);
      xhr["responseType"] = "arraybuffer";
      return xhr["send"]();
    });
  };
}
