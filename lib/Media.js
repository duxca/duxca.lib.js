"use strict";
function loadMediaStream(opt) {
    if (navigator.mediaDevices != null && navigator.mediaDevices.getUserMedia instanceof Function) {
        console.info("use navigator.mediaDevices.getUserMedia");
        return navigator.mediaDevices.getUserMedia(opt);
    }
    else if (navigator.getUserMedia instanceof Function) {
        console.info("use navigator.getUserMedia");
        return new Promise(function (resolve, reject) {
            return navigator.getUserMedia(opt, resolve, reject);
        });
    }
    else if (navigator["webkitGetUserMedia"] instanceof Function) {
        console.info("use navigator.webkitGetUserMedia");
        return new Promise(function (resolve, reject) {
            return navigator["webkitGetUserMedia"](opt, resolve, reject);
        });
    }
    alert("cannot use user media");
    return Promise.reject(new Error("cannot use user media"));
}
exports.loadMediaStream = loadMediaStream;
function getMediaElementState(media) {
    return media.ended ? "ended" :
        media.paused ? "paused" :
            media.seeking ? "seeking" :
                "playing";
}
exports.getMediaElementState = getMediaElementState;
function getMediaStreamVideo(opt) {
    return loadMediaStream(opt).then(getVideoFromMediaStream);
}
exports.getMediaStreamVideo = getMediaStreamVideo;
function getVideoFromMediaStream(stream) {
    var url = URL.createObjectURL(stream);
    return load_video(url).then(function (video) {
        URL.revokeObjectURL(url);
        return video;
    });
}
exports.getVideoFromMediaStream = getVideoFromMediaStream;
function load_video(url, use_bugfix) {
    if (use_bugfix === void 0) { use_bugfix = false; }
    var video = document.createElement("video");
    video.src = url;
    function load() {
        return new Promise(function (resolve, reject) {
            function loadeddata() {
                video.removeEventListener("loadeddata", loadeddata);
                video.removeEventListener("error", error);
                resolve(video);
            }
            function error(err) {
                video.removeEventListener("loadeddata", loadeddata);
                video.removeEventListener("error", error);
                console.error("video load error", err);
                // ファイルが壊れてる
                reject(new Error("video load error"));
            }
            video.addEventListener("loadeddata", loadeddata);
            video.addEventListener("error", error);
        });
    }
    if (!use_bugfix) {
        return load();
    }
    // http://www.marushima.info/?eid=3088
    // MediaRecorder で録画した動画の duration が決定できないという<del>バグ</del><add>仕様</add>対策。
    // とりあえず一週間後の時間を指定することでビデオの最後のチャンクを強制的に読み込ませる
    // Infinity はできないので。
    video.currentTime = 60 * 60 * 24 * 7;
    return Promise.all([
        load(),
        new Promise(function (resolve, reject) {
            setTimeout(function listener() {
                if (video.readyState === 4) {
                    resolve();
                }
                else {
                    setTimeout(listener, 30);
                }
            });
        }),
        new Promise(function (resolve, reject) {
            video.addEventListener("seeked", function listener() {
                video.removeEventListener("seeked", listener);
                resolve();
            });
        }),
    ]).then(function () {
        // 最後に currentTime を 0 に戻す
        video.currentTime = 0;
        return new Promise(function (resolve, reject) {
            video.addEventListener("seeked", function listener() {
                video.removeEventListener("seeked", listener);
                resolve(video);
            });
        });
    });
}
exports.load_video = load_video;
