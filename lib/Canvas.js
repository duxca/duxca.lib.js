"use strict";
var Ajax_1 = require("./Ajax");
// tmpcnvにコピー
function fastcopy(cnv, tmpctx) {
    tmpctx.canvas.width = cnv.width;
    tmpctx.canvas.height = cnv.height;
    //tmpctx.globalCompositeOperation = "source-over";
    tmpctx.drawImage(cnv, 0, 0); // type hack
}
exports.fastcopy = fastcopy;
// ArrayBuffer -> HTMLImageElement
function fetchImageFromArrayBuffer(buffer, mimetype) {
    var url = URL.createObjectURL(new Blob([buffer], { type: "image/png" }));
    return Ajax_1.fetchImageFromURL(url).then(function (img) {
        URL.revokeObjectURL(url);
        return img;
    });
}
exports.fetchImageFromArrayBuffer = fetchImageFromArrayBuffer;
// copy canvas as new object
// this copy technic is faster than getImageData full copy, but some pixels are bad copy.
// see also: http://stackoverflow.com/questions/4405336/how-to-copy-contents-of-one-canvas-to-another-canvas-locally
function copy(cnv) {
    var _copy = document.createElement("canvas");
    var ctx = _copy.getContext("2d");
    if (cnv instanceof HTMLVideoElement) {
        _copy.width = cnv.videoWidth;
        _copy.height = cnv.videoHeight;
    }
    else {
        _copy.width = cnv.width;
        _copy.height = cnv.height;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(cnv, 0, 0); // type hack
    return _copy;
}
exports.copy = copy;
function cnvToBlob(cnv, mimeType, qualityArgument) {
    return new Promise(function (resolve, reject) {
        cnv.toBlob(function (blob) {
            if (blob instanceof Blob)
                resolve(blob);
            else
                reject(new Error("cannot get blob from canvas"));
        }, mimeType, qualityArgument);
    });
}
exports.cnvToBlob = cnvToBlob;
function createVideoCanvasRenderer(video) {
    var cnv = document.createElement("canvas");
    var ctx = cnv.getContext("2d");
    var videoWidth = video.videoWidth, videoHeight = video.videoHeight;
    cnv.width = videoWidth;
    cnv.height = videoHeight;
    function renderer() {
        cnv.width = cnv.width;
        ctx.drawImage(video, 0, 0);
    }
    //document.body.appendChild(video); // for debug
    //document.body.appendChild(cnv); // for debug
    return { ctx: ctx, renderer: renderer };
}
exports.createVideoCanvasRenderer = createVideoCanvasRenderer;
function create_video_canvas(video, step) {
    var cnv = document.createElement("canvas");
    var _ctx = cnv.getContext("2d");
    if (_ctx == null)
        throw new Error("cannot get CanvasRenderingContext2D");
    var ctx = _ctx;
    var videoWidth = video.videoWidth, videoHeight = video.videoHeight;
    cnv.width = videoWidth;
    cnv.height = videoHeight;
    var paused = false;
    video.addEventListener("playing", function (ev) { paused = false; requestAnimationFrame(_draw); });
    video.addEventListener("pause", function (ev) { paused = true; });
    video.addEventListener("ended", function (ev) { paused = true; });
    // timeupdate の更新間隔はフレーム更新間隔ではないので描画には使えない
    // video.addEventListener("timeupdate", (ev)=>{});
    function _draw() {
        cnv.width = cnv.width;
        ctx.drawImage(video, 0, 0);
        step(ctx.canvas);
        if (!paused)
            requestAnimationFrame(_draw);
    }
    _draw(); // clipping draw loop start
    return ctx;
}
exports.create_video_canvas = create_video_canvas;
// 1x1の canvas を作るだけ
function createCanvas(width, height) {
    if (width === void 0) { width = 1; }
    if (height === void 0) { height = 1; }
    var cnv = document.createElement("canvas");
    cnv.width = width;
    cnv.height = height;
    return cnv;
}
exports.createCanvas = createCanvas;
exports.loadImage = load_image;
function load_image(url) {
    return Ajax_1.fetchImageFromURL(url);
}
exports.load_image = load_image;
exports.loadCanvas = load_cnv;
function load_cnv(src) {
    return load_image(src).then(copy);
}
exports.load_cnv = load_cnv;
