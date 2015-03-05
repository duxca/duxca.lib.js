/// <reference path="../typings/tsd.d.ts" />
/// <reference path="./duxca.lib.ts" />
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
                var b, g, p, q, r;
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
                    q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1 / 3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1 / 3);
                }
                return [r * 255, g * 255, b * 255];
            }
            Canvas.hslToRgb = hslToRgb;
        })(Canvas = lib.Canvas || (lib.Canvas = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/*

initCanvas = (width, height)->
  cnv = document.createElement("canvas")
  cnv.width = width
  cnv.height = height
  ctx = cnv.getContext("2d")
  [cnv, ctx]

strokeArray = (cnv, ctx, ary, flagX=false, flagY=false)->
  zoomX = if !flagX then 1 else cnv.width/ary.length
  zoomY = if !flagY then 1 else cnv.height/Math.max.apply(null, ary)
  ctx.beginPath()
  ctx.moveTo(0, cnv.height - ary[0]*zoomY)
  for i in [1...ary.length]
    ctx.lineTo(zoomX*i, cnv.height - ary[i]*zoomY)
  ctx.stroke()
  return

colLine = (cnv, ctx, x)->
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, cnv.height)
  ctx.stroke()

rowLine = (cnv, ctx, y)->
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(cnv.width, y)
  ctx.stroke()
initCanvas = (width, height)->
  cnv = document.createElement("canvas")
  cnv.width = width
  cnv.height = height
  ctx = cnv.getContext("2d")
  [cnv, ctx]




getMediaStream = ->
  new Promise (resolve, reject)->
    navigator.getUserMedia({video: false, audio: true}, resolve, reject)

strokeArray = (cnv, ctx, ary, flagX=false, flagY=false)->
  zoomX = if !flagX then 1 else cnv.width/ary.length
  zoomY = if !flagY then 1 else cnv.height/Math.max.apply(null, ary)
  ctx.beginPath()
  ctx.moveTo(0, cnv.height - ary[0]*zoomY)
  for i in [1...ary.length]
    ctx.lineTo(zoomX*i, cnv.height - ary[i]*zoomY)
  ctx.stroke()
  return


drawSpectrogramToImageData = (cnv, ctx, spectrogram, max=255)->
  imgdata = ctx.createImageData(spectrogram.length or 1, spectrogram[0]?.length or 1)
  for spectrum, i in spectrogram
    for _, j in spectrum
      [r, g, b] = hslToRgb(spectrum[j]/max, 0.5, 0.5)
      [x, y] = [i, imgdata.height - 1 - j]
      index = x + y*imgdata.width
      imgdata.data[index*4+0] = b|0
      imgdata.data[index*4+1] = g|0
      imgdata.data[index*4+2] = r|0
      imgdata.data[index*4+3] = 255
  imgdata




*/
