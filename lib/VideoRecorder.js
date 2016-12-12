/// <reference path="./decls/globals.d.ts" />
"use strict";
var VideoRecorder = (function () {
    function VideoRecorder(stream) {
        var _this = this;
        this.chunks = []; // この chunk のためにクラスを作った
        this.recorder = new MediaRecorder(stream, { "mimeType": 'video/webm; codecs="vp8, opus"' });
        /*
        // こんなプロパティもあるよということでひとつ
        this.recorder.mimeType //
        this.recorder.state // "inactive, recording, or paused"
        this.recorder.stream
        this.recorder.videoBitsPerSecond
        this.recorder.audioBitsPerSecond;
        */
        this.recorder.ondataavailable = function (ev) {
            _this.chunks.push(ev.data);
        };
        this.recorder.onerror = function (ev) {
            console.error(ev, ev.message);
        };
    }
    VideoRecorder.prototype.start = function () {
        this.recorder.start();
    };
    VideoRecorder.prototype.stop = function () {
        this.recorder.stop();
    };
    VideoRecorder.prototype.clear = function () {
        this.chunks = [];
    };
    VideoRecorder.prototype.getBlob = function () {
        return new Blob(this.chunks, { 'type': 'video/webm' });
    };
    return VideoRecorder;
}());
exports.VideoRecorder = VideoRecorder;
