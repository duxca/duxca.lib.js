"use strict";
var Event_1 = require("./Event");
function fetchXHR(url, responseType) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("load", function () {
            // 0 は blob:// とか file:// とか module:// のとき
            if (xhr.status === 0 || 200 <= xhr.status && xhr.status < 300) {
                resolve(xhr.response);
            }
            else {
                reject(xhr);
            }
        });
        xhr.addEventListener("error", function (ev) {
            reject(xhr);
        });
        xhr.open("GET", url);
        xhr.responseType = responseType;
        return xhr.send();
    });
}
exports.fetchXHR = fetchXHR;
function fetchText(url) {
    return fetchXHR(url, "text");
}
exports.fetchText = fetchText;
function fetchDocument(url) {
    return fetchXHR(url, "document");
}
exports.fetchDocument = fetchDocument;
function fetchJSON(url) {
    return fetchXHR(url, "json");
}
exports.fetchJSON = fetchJSON;
function fetchArrayBuffer(url) {
    return fetchXHR(url, "arraybuffer");
}
exports.fetchArrayBuffer = fetchArrayBuffer;
function fetchBlob(url) {
    return fetchXHR(url, "blob");
}
exports.fetchBlob = fetchBlob;
function fetchImage(url) {
    var img = new Image();
    img.src = url;
    return Event_1.fetchEvent(img, "load", "error").then(function () { return img; });
}
exports.fetchImage = fetchImage;
function fetchScript(url) {
    var script = document.createElement("script");
    script.src = url;
    document.head.appendChild(script);
    return Event_1.fetchEvent(script, "load", "error");
}
exports.fetchScript = fetchScript;
/**
 * force: URL.revokeObjectURL
 */
function fetchBlobURL(fetch, blob) {
    var url = URL.createObjectURL(blob);
    return fetch(url).then(function (o) {
        URL.revokeObjectURL(url);
        return o;
    });
}
exports.fetchBlobURL = fetchBlobURL;
function fetchAudio(url, try_to_get_duration) {
    if (try_to_get_duration === void 0) { try_to_get_duration = false; }
    return fetchMedia("audio", url, try_to_get_duration);
}
exports.fetchAudio = fetchAudio;
function fetchVideo(url, try_to_get_duration) {
    if (try_to_get_duration === void 0) { try_to_get_duration = false; }
    return fetchMedia("video", url, try_to_get_duration);
}
exports.fetchVideo = fetchVideo;
function fetchMedia(type, url, try_to_get_duration) {
    if (try_to_get_duration === void 0) { try_to_get_duration = false; }
    var media = document.createElement(type);
    media.src = url;
    if (!try_to_get_duration) {
        return Event_1.fetchEvent(media, "loadeddata", "error").then(function () { return media; });
    }
    // http://www.marushima.info/?eid=3088
    // MediaRecorder で録画した動画の duration が決定できないという<del>バグ</del><add>仕様</add>対策。
    // とりあえず一週間後の時間を指定することでビデオの最後のチャンクを強制的に読み込ませる
    // Infinity はできないので。
    media.currentTime = 60 * 60 * 24 * 7;
    return Promise.all([
        Event_1.fetchEvent(media, "loadeddata", "error"),
        Event_1.fetchEvent(media, "seeked", "error")
    ])
        .then(function () {
        // 最後に currentTime を 0 に戻す
        media.currentTime = 0;
        return Event_1.fetchEvent(media, "seeked", "error");
    })
        .then(function () { return media; });
}
