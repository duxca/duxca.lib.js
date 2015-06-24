/// <reference path="../../typings/tsd.d.ts" />
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Canvas;
        (function (Canvas) {
            function hue2rgb(p, q, t) {
                if (t < 0) {
                    t += 1;
                }
                if (t > 1) {
                    t -= 1;
                }
                if (t < 1 / 6) {
                    return p + (q - p) * 6 * t;
                }
                if (t < 1 / 2) {
                    return q;
                }
                if (t < 2 / 3) {
                    return p + (q - p) * (2 / 3 - t) * 6;
                }
                return p;
            }
            Canvas.hue2rgb = hue2rgb;
            function hslToRgb(h, s, l) {
                // h, s, l: 0~1
                var r, g, b;
                h *= 5 / 6;
                if (h < 0) {
                    h = 0;
                }
                if (5 / 6 < h) {
                    h = 5 / 6;
                }
                if (s === 0) {
                    r = g = b = l;
                }
                else {
                    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    var p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1 / 3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1 / 3);
                }
                return [r * 255, g * 255, b * 255];
            }
            Canvas.hslToRgb = hslToRgb;
            function initCanvas(width, height) {
                var cnv = document.createElement("canvas");
                cnv.width = width;
                cnv.height = height;
                var ctx = cnv.getContext("2d");
                return [cnv, ctx];
            }
            Canvas.initCanvas = initCanvas;
            function strokeArray(cnv, ctx, arr, flagX, flagY) {
                if (flagX === void 0) { flagX = false; }
                if (flagY === void 0) { flagY = false; }
                var zoomX = !flagX ? 1 : cnv.width / arr.length;
                var zoomY = !flagY ? 1 : cnv.height / Math.max.apply(null, arr);
                ctx.beginPath();
                ctx.moveTo(0, cnv.height - arr[0] * zoomY);
                for (var i = 1; 1 < arr.length; i++) {
                    ctx.lineTo(zoomX * i, cnv.height - arr[i] * zoomY);
                }
                ctx.stroke();
            }
            Canvas.strokeArray = strokeArray;
            function colLine(cnv, ctx, x) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, cnv.height);
                return ctx.stroke();
            }
            Canvas.colLine = colLine;
            function rowLine(cnv, ctx, y) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(cnv.width, y);
                return ctx.stroke();
            }
            Canvas.rowLine = rowLine;
            function drawSpectrogramToImageData(cnv, ctx, spectrogram, max) {
                if (max === void 0) { max = 255; }
                var x, y;
                var imgdata = ctx.createImageData(spectrogram.length, spectrogram[0].length);
                for (var i = 0; i < spectrogram.length; i++) {
                    var spectrum = spectrogram[i];
                    for (var j = 0; j < spectrum.length; j++) {
                        var _a = hslToRgb(spectrum[j] / max, 0.5, 0.5), r = _a[0], g = _a[1], b = _a[2];
                        var _b = [i, imgdata.height - 1 - j], x = _b[0], y = _b[1];
                        var index = x + y * imgdata.width;
                        imgdata.data[index * 4 + 0] = b | 0;
                        imgdata.data[index * 4 + 1] = g | 0;
                        imgdata.data[index * 4 + 2] = r | 0;
                        imgdata.data[index * 4 + 3] = 255;
                    }
                }
                return imgdata;
            }
            Canvas.drawSpectrogramToImageData = drawSpectrogramToImageData;
        })(Canvas = lib.Canvas || (lib.Canvas = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
