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
    h *= 5 / 6;
    if (h < 0) {
      h = 0;
    }
    if (5 / 6 < h) {
      h = 5 / 6;
    }
    var r:number,g:number,b:number;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
  }

  export function initCanvas(width:number, height:number):[HTMLCanvasElement, CanvasRenderingContext2D] {
    var cnv = document.createElement("canvas");
    cnv.width = width;
    cnv.height = height;
    var ctx = <CanvasRenderingContext2D>cnv.getContext("2d");
    return [cnv, ctx];
  }

  export function strokeArray(cnv:HTMLCanvasElement, ctx:CanvasRenderingContext2D, ary:number[], flagX:boolean=false, flagY:boolean=false):void {
    var zoomX = !flagX ? 1 : cnv.width / ary.length;
    var zoomY = !flagY ? 1 : cnv.height / Math.max.apply(null, ary);
    ctx.beginPath();
    ctx.moveTo(0, cnv.height - ary[0] * zoomY); 
    for(var i = 1; i <ary.length; i++){
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

  export function drawSpectrogramToImageData(cnv:HTMLCanvasElement, ctx:CanvasRenderingContext2D, spectrogram:number[][], max=255):ImageData {
    var imgdata = ctx.createImageData(spectrogram.length, spectrogram[0].length);
    for (var i = 0; i < spectrogram.length; i++) {
      for (var j = 0; j < spectrogram[i].length; j++) {
        var [r,g,b] = hslToRgb(spectrogram[i][j] / max, 0.5, 0.5);
        var [x, y] = [i, imgdata.height - 1 - j];
        var index = x + y * imgdata.width;
        imgdata.data[index * 4 + 0] = b | 0;
        imgdata.data[index * 4 + 1] = g | 0;
        imgdata.data[index * 4 + 2] = r | 0;
        imgdata.data[index * 4 + 3] = 255;
      }
    }
    return imgdata;
  }
}