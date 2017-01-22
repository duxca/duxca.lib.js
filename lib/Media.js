"use strict";
var Event_1 = require("./Event");
var Canvas_1 = require("./Canvas");
var Blob_1 = require("./Blob");
function getState(media) {
    return media.ended ? "ended" :
        media.paused ? "paused" :
            media.seeking ? "seeking" :
                "playing";
}
exports.getState = getState;
function fetchThumbnailAsBlob(video, currentTime) {
    if (currentTime > video.duration) {
        return Promise.reject(new Error("currentTime is out of video duration"));
    }
    return seekTo(video, currentTime)
        .then(Canvas_1.copy)
        .then(function (cnv) { return Canvas_1.toBlob(cnv, "image/jpeg", 0.8); });
}
exports.fetchThumbnailAsBlob = fetchThumbnailAsBlob;
function fetchThumbnailAsDataURL(video, currentTime) {
    return fetchThumbnailAsBlob(video, currentTime).then(Blob_1.readAsDataURL);
}
exports.fetchThumbnailAsDataURL = fetchThumbnailAsDataURL;
function seekTo(media, currentTime) {
    media.currentTime = currentTime;
    return Event_1.fetchEvent(media, "seeked").then(function () { return media; });
}
exports.seekTo = seekTo;
function fetchMediaStream(opt) {
    var getUserMedia;
    if (navigator.mediaDevices != null) {
        getUserMedia = navigator.mediaDevices.getUserMedia
            || navigator.mediaDevices["webkitGetUserMedia"]
            || navigator.mediaDevices["mozGetUserMedia"]
            || navigator.mediaDevices["msGetUserMedia"];
        return getUserMedia.call(navigator.mediaDevices, opt);
    }
    getUserMedia = navigator.getUserMedia
        || navigator["webkitGetUserMedia"]
        || navigator["mozGetUserMedia"]
        || navigator["msGetUserMedia"];
    return new Promise(getUserMedia.bind(navigator, opt));
}
exports.fetchMediaStream = fetchMediaStream;
