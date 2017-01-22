"use strict";
/**
 *  copy canvas as new object
 * this copy technic is faster than getImageData full copy, but some pixels are bad copy.
 * see also: http://stackoverflow.com/questions/4405336/how-to-copy-contents-of-one-canvas-to-another-canvas-locally
 */
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
function toBlob(cnv, mimeType, qualityArgument) {
    return new Promise(function (resolve, reject) {
        cnv.toBlob(function (blob) {
            if (blob instanceof Blob)
                resolve(blob);
            else
                reject(new Error("cannot get blob from canvas"));
        }, mimeType, qualityArgument);
    });
}
exports.toBlob = toBlob;
