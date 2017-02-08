"use strict";
var Event_1 = require("./Event");
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
function fetch(sender, useLocal) {
    if (useLocal === void 0) { useLocal = false; }
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function (ev) {
            if (xhr.readyState !== 4) {
                return;
            }
            if (useLocal && xhr.status === 0) {
                if (xhr.response === null) {
                    return reject(xhr);
                }
                return resolve(xhr.response);
            }
            if (200 === xhr.status) {
                return resolve(xhr.response);
            } // only 200
            return reject(xhr); // 1xx - Information, 3xx - Redirection, 4xx - Client Error , 5xx - Server Error
        };
        xhr.onerror = function (ev) { reject(xhr); };
        sender(xhr);
    });
}
exports.fetch = fetch;
/**
 * get only content-length
 */
function fetchSize(url) {
    return fetchRange(url, 0, 0).then(function (_a) {
        var total = _a.total;
        return total;
    });
}
exports.fetchSize = fetchSize;
/**
 * HTTP1.1 Range Request
 */
function fetchRange(url, begin, end) {
    var range = Number(begin) + "-" + Number(end);
    return fetch(function (xhr) {
        xhr.open("GET", url);
        xhr.responseType = "arraybuffer";
        xhr.setRequestHeader('Range', 'bytes=' + range);
        xhr.send();
    })
        .then(Promise.reject)
        .catch(function (xhr) {
        if (xhr.status !== 206) {
            return Promise.reject(xhr);
        }
        var type = xhr.getResponseHeader("Content-Type") || "";
        var range = xhr.getResponseHeader("Content-Range") || "";
        var _a = (/bytes (\d+)\-(\d+)\/(\d+|\*)/.exec(range) || ["_", "*", "*", "*"]), _ = _a[0], b = _a[1], e = _a[2], t = _a[3];
        var begin = Number(b);
        var end = Number(e);
        var total = Number(t);
        var buffer = xhr.response;
        return { buffer: buffer, begin: begin, end: end, total: total, type: type };
    });
}
exports.fetchRange = fetchRange;
function fetchXHR(url, responseType, useLocal) {
    if (useLocal === void 0) { useLocal = false; }
    return fetch(function (xhr) {
        xhr.responseType = responseType;
        xhr.open("GET", url);
        xhr.send();
    }, useLocal);
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
