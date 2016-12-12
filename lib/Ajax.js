"use strict";
function fetchXHR(url, responseType) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        var warn = function (msg) {
            console.warn("fetchArrayBuffer: ", msg, xhr);
            reject(msg);
        };
        xhr.addEventListener("load", function () {
            // 0 は blob:// とか file:// とか module:// のとき
            if (xhr.status === 0 || 200 <= xhr.status && xhr.status < 300) {
                if (xhr.response.error == null) {
                    resolve(xhr.response);
                }
                else {
                    warn("xhr.response.error.message: " + xhr.response.error.message);
                }
            }
            else {
                warn("xhr.status: " + xhr.status);
            }
        });
        xhr.addEventListener("error", function () {
            warn("xhr.response.error.message: " + xhr.response.error.message);
        });
        xhr.open("GET", url);
        xhr.responseType = responseType;
        return xhr.send();
    });
}
exports.fetchXHR = fetchXHR;
// XMLHttpRequest, xhr.responseType = "arraybuffer"
function fetchArrayBuffer(url) {
    return fetchXHR(url, "arraybuffer");
}
exports.fetchArrayBuffer = fetchArrayBuffer;
// XMLHttpRequest, xhr.responseType = "blob"
function fetchBlob(url) {
    return fetchXHR(url, "blob");
}
exports.fetchBlob = fetchBlob;
function getArrayBuffer(url) {
    console.warn("getArrayBuffer is deprecated");
    return fetchArrayBuffer(url);
}
exports.getArrayBuffer = getArrayBuffer;
// URL -> HTMLImageElement
function fetchImageFromURL(url) {
    return new Promise(function (resolve, reject) {
        var img = new Image();
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
exports.fetchImageFromURL = fetchImageFromURL;
function loadScript(url) {
    var script = document.createElement("script");
    script.src = url;
    document.body.appendChild(script);
    return new Promise(function (resolve) {
        script.onload = resolve;
    });
}
exports.loadScript = loadScript;
