/// <reference path="../typings/tsd.d.ts"/>

import Signal = require("./Signal");
import Statictics = require("./Statictics");

class Render {
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

  drawSignal(signal:Float32Array, flagX:boolean=false, flagY:boolean=false):void {
    if(flagY){
      signal = Signal.normalize(signal, 1);
    }
    var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
    var zoomY = !flagY ? 1 : this.cnv.height / Statictics.findMax(signal)[0];
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

  cross(x: number, y: number, size: number): void{
    this.ctx.beginPath();
    this.ctx.moveTo(x+size, y+size);
    this.ctx.lineTo(x-size, y-size);
    this.ctx.moveTo(x-size, y+size);
    this.ctx.lineTo(x+size, y-size);
    this.ctx.stroke();
  }

  arc(x: number, y: number, size: number): void{
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, 2*Math.PI, false);
    this.ctx.stroke();
  }

  drawSpectrogram(spectrogram:Float32Array[], max=255):void {
    var imgdata = this.ctx.createImageData(spectrogram.length, spectrogram[0].length);
    for (var i = 0; i < spectrogram.length; i++) {
      for (var j = 0; j < spectrogram[i].length; j++) {
        var [r,g,b] = CanvasRender.hslToRgb(spectrogram[i][j] / max, 0.5, 0.5);
        var [x, y] = [i, imgdata.height - 1 - j];
        var index = x + y * imgdata.width;
        imgdata.data[index * 4 + 0] = b | 0;
        imgdata.data[index * 4 + 1] = g | 0;
        imgdata.data[index * 4 + 2] = r | 0; // is this bug?
        imgdata.data[index * 4 + 3] = 255;
      }
    }
    this.ctx.putImageData(imgdata, 0, 0)
  }

  _drawSpectrogram(rawdata: Float32Array, sampleRate:number){
    var windowsize = Math.pow(2, 8); // spectrgram height
    var slidewidth = Math.pow(2, 5); // spectrgram width rate
    console.log(
      "sampleRate:", sampleRate, "\n",
      "windowsize:", windowsize, "\n",
      "slidewidth:", slidewidth, "\n",
      "windowsize(ms):", windowsize/sampleRate*1000, "\n",
      "slidewidth(ms):", slidewidth/sampleRate*1000, "\n"
    );
    var spectrums: Float32Array[] = [];
    for(var ptr=0; ptr+windowsize < rawdata.length; ptr += slidewidth){
      var buffer = rawdata.subarray(ptr, ptr+windowsize);
      if(buffer.length!==windowsize) break;
      var spectrum = Signal.fft(buffer, sampleRate)[2];
      for(var i=0; i<spectrum.length;i++){
        spectrum[i] = spectrum[i]*20000;
      }
      spectrums.push(spectrum);
    }
    console.log(
      "ptr", 0+"-"+(ptr-1)+"/"+rawdata.length,
      "ms", 0/sampleRate*1000+"-"+(ptr-1)/sampleRate*1000+"/"+rawdata.length*1000/sampleRate,
      spectrums.length+"x"+spectrums[0].length
    );
    this.cnv.width = spectrums.length;
    this.cnv.height = spectrums[0].length;
    this.drawSpectrogram(spectrums);
  }
}



namespace CanvasRender {

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
}

export = Render;
