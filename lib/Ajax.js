"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
function fetch(xhr, useLocal) {
    if (useLocal === void 0) { useLocal = false; }
    return new Promise(function (resolve, reject) {
        xhr.onreadystatechange = function (ev) {
            if (xhr.readyState !== 4) {
                return;
            }
            if (useLocal && xhr.status === 0) {
                if (xhr.response === null) {
                    return reject(xhr);
                }
                return resolve(xhr);
            }
            if (200 === xhr.status) {
                return resolve(xhr);
            } // only 200
            return reject(xhr); // 1xx - Information, 3xx - Redirection, 4xx - Client Error , 5xx - Server Error
        };
        xhr.onerror = function (ev) { reject(xhr); };
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
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader('Range', 'bytes=' + range);
    xhr.send();
    return fetch(xhr)
        .then(function (xhr) {
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
    var xhr = new XMLHttpRequest();
    xhr.responseType = responseType;
    xhr.open("GET", url);
    xhr.send();
    return fetch(xhr, useLocal).then(function (xhr) { return xhr.response; });
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
function fetchArrayBufferWithContentType(url) {
    return __awaiter(this, void 0, void 0, function () {
        var xhr, mimeType, buffer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    xhr = new XMLHttpRequest();
                    xhr.responseType = "arraybuffer";
                    xhr.open("GET", url);
                    xhr.send();
                    return [4 /*yield*/, fetch(xhr)];
                case 1:
                    _a.sent();
                    mimeType = xhr.getResponseHeader("Content-Type");
                    buffer = xhr.response;
                    if (mimeType == null) {
                        return [2 /*return*/, Promise.reject(new Error("cannot get mime type"))];
                    }
                    if (buffer == null) {
                        return [2 /*return*/, Promise.reject(new Error("cannot get buffer"))];
                    }
                    return [2 /*return*/, { mimeType: mimeType, buffer: buffer }];
            }
        });
    });
}
exports.fetchArrayBufferWithContentType = fetchArrayBufferWithContentType;
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
