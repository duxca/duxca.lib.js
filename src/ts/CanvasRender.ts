module duxca.lib {

  function hue2rgb(p:number, q:number, t:number):number {
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1 / 6) { return p + (q - p) * 6 * t; }
    if (t < 1 / 2) { return q; }
    if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
    return p;
  }

  function hslToRgb(h:number, s:number, l:number):[number, number, number] {
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

  export class CanvasRender{

    element: HTMLCanvasElement;
    cnv: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor(width: number, height: number){
      this.element = this.cnv = document.createElement("canvas");
      this.cnv.width = width;
      this.cnv.height = height;
      this.ctx = <CanvasRenderingContext2D>this.cnv.getContext("2d");
    }
    
    clear(): void{
      this.cnv.width = this.cnv.width;
    }

    drawSignal(signal:number[]|Float32Array, flagX:boolean=false, flagY:boolean=false):void {
      var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
      var zoomY = !flagY ? 1 : this.cnv.height / Math.max.apply(null, signal);
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.cnv.height - signal[0] * zoomY);
      for(var i = 1; i<signal.length; i++){
        this.ctx.lineTo(zoomX * i, this.cnv.height - signal[i] * zoomY);
      }
      this.ctx.stroke();
    }

    drawColLine(x:number):void {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.cnv.height);
      this.ctx.stroke();
    }

    drawRowLine(y:number):void {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.cnv.width, y);
      this.ctx.stroke();
    }

    drawSpectrogram(spectrogram:Float32Array[], max=255):void {
      var imgdata = this.ctx.createImageData(spectrogram.length, spectrogram[0].length);
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
      this.ctx.putImageData(imgdata, 0, 0)
    }
  }
}
