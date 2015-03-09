/// <reference path="../typings/tsd.d.ts" />

module duxca.lib.Canvas {

  export function hue2rgb(p:number, q:number, t:number):number {
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1 / 6) { return p + (q - p) * 6 * t; }
    if (t < 1 / 2) { return q; }
    if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
    return p;
  }

  export function hslToRgb(h:number, s:number, l:number):[number, number, number] {
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
    } else {
      q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
  }

  export function initCanvas(width:number, height:number):[HTMLCanvasElement, CanvasRenderingContext2D] {
    var cnv, ctx;
    cnv = document.createElement("canvas");
    cnv.width = width;
    cnv.height = height;
    ctx = cnv.getContext("2d");
    return [cnv, ctx];
  }

  export function strokeArray(cnv:HTMLCanvasElement, ctx:CanvasRenderingContext2D, ary:number[], flagX:boolean=false, flagY:boolean=false):void {
    var i, j, ref, zoomX, zoomY;
    zoomX = !flagX ? 1 : cnv.width / ary.length;
    zoomY = !flagY ? 1 : cnv.height / Math.max.apply(null, ary);
    ctx.beginPath();
    ctx.moveTo(0, cnv.height - ary[0] * zoomY);
    for (i = j = 1, ref = ary.length; 1 <= ref ? j < ref : j > ref; i = 1 <= ref ? ++j : --j) {
      ctx.lineTo(zoomX * i, cnv.height - ary[i] * zoomY);
    }
    ctx.stroke();
  }

  export function colLine(cnv:HTMLCanvasElement, ctx:CanvasRenderingContext2D, x:number):void {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cnv.height);
    return ctx.stroke();
  }

  export function rowLine(cnv:HTMLCanvasElement, ctx:CanvasRenderingContext2D, y:number):void {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cnv.width, y);
    return ctx.stroke();
  }

  export function drawSpectrogramToImageData(cnv:HTMLCanvasElement, ctx:CanvasRenderingContext2D, spectrogram:number[][], max:number=255):ImageData {
    var _, b, g, i, imgdata, index, j, k, l, len, len1, r, ref, ref1, ref2, spectrum, x, y;
    if (max == null) {
      max = 255;
    }
    imgdata = ctx.createImageData(spectrogram.length || 1, ((ref = spectrogram[0]) != null ? ref.length : void 0) || 1);
    for (i = k = 0, len = spectrogram.length; k < len; i = ++k) {
      spectrum = spectrogram[i];
      for (j = l = 0, len1 = spectrum.length; l < len1; j = ++l) {
        _ = spectrum[j];
        ref1 = hslToRgb(spectrum[j] / max, 0.5, 0.5), r = ref1[0], g = ref1[1], b = ref1[2];
        ref2 = [i, imgdata.height - 1 - j], x = ref2[0], y = ref2[1];
        index = x + y * imgdata.width;
        imgdata.data[index * 4 + 0] = b | 0;
        imgdata.data[index * 4 + 1] = g | 0;
        imgdata.data[index * 4 + 2] = r | 0;
        imgdata.data[index * 4 + 3] = 255;
      }
    }
    return imgdata;
  }
}
