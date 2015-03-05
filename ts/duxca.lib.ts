/// <reference path="../thirdparty/dsp/dsp.d.ts" />
module duxca.lib {
  type Integer = number;
  type Float = number;


  export function calcCorr(signal:Float32Array, input:Float32Array, sampleRate=44100):Float32Array {
    var fft = new FFT(input.length, sampleRate);
    fft.forward(signal);
    var sig_spectrum = new Float32Array(fft.spectrum);
    var sig_real = new Float32Array(fft.real);
    var sig_imag = new Float32Array(fft.imag);
    fft.forward(input);
    var spectrum = new Float32Array(fft.spectrum);
    var real = new Float32Array(fft.real);
    var imag = new Float32Array(fft.imag);
    var cross_real = Array.prototype.map.call(real, (_, i)=> sig_real[i] * real[i] / real.length );
    var cross_imag = Array.prototype.map.call(imag, (_, i)=>-sig_real[i] * imag[i] / imag.length );
    var inv_real = fft.inverse(cross_real, cross_imag);
    return inv_real;
  }

  export function hue2rgb(p:Float, q:Float, t:Float):Float {
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1 / 6) { return p + (q - p) * 6 * t; }
    if (t < 1 / 2) { return q; }
    if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
    return p;
  }

  export function hslToRgb(h:Float, s:Float, l:Float):[Float, Float, Float] {
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

  export function indexToFreq(index:Integer, sampleRate:Integer, fftSize:Integer):Float {
    return (index * sampleRate) / fftSize;
  }

  export function freqToIndex(freq:Float, sampleRate:Integer, fftSize:Integer):Integer {
    return (freq * fftSize) / sampleRate | 0;
  }

  export function timeToIndex(sampleRate:Integer, time:Float):Integer {
    return sampleRate * time | 0;
  }

  export function indexToTime(sampleRate:Integer, currentIndex:Integer):Float {
    return currentIndex / sampleRate;
  }

  export function summation(ary:Float[]):Float {
    var j, len, sum, v;
    sum = 0;
    for (j = 0, len = ary.length; j < len; j++) {
      v = ary[j];
      sum += v;
    }
    return sum;
  }

  export function average(ary:Float[]):Float {
    return summation(ary) / ary.length;
  }

  export function variance(ary:Float[]):Float {
    var ave, j, len, sum, v;
    ave = average(ary);
    sum = 0;
    for (j = 0, len = ary.length; j < len; j++) {
      v = ary[j];
      sum += Math.pow(v - ave, 2);
    }
    return sum / (ary.length - 1);
  }

  export function stdev(ary:Float[]):Float {
    return Math.sqrt(variance(ary));
  }

  export function derivative(ary:Float[]):Float[] {
    var i;
    return [0].concat((function() {
      var j, ref, results;
      results = [];
      for (i = j = 1, ref = ary.length - 1; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
        results.push(ary[i] - ary[i - 1]);
      }
      return results;
    })());
  }
  export function median(ary:Float[]):Float {
    return Array.prototype.slice.call(ary, 0).sort()[ary.length / 2 | 0];
  }

  export function KDE(ary:Float[], h?:Float):Float[] {
    var f, j, kernel, len, results, x;
    if (h == null) {
      h = 1.06 * stdev(ary) * Math.pow(ary.length, -1 / 5) + 0.0000000001;
    }
    kernel = function(x) {
      return Math.pow(Math.E, -Math.pow(x, 2) / 2) / Math.sqrt(2 * Math.PI);
    };
    f = function(x) {
      var i, j, len, s, v;
      s = 0;
      for (i = j = 0, len = ary.length; j < len; i = ++j) {
        v = ary[i];
        s += kernel((x - v) / h);
      }
      return s / (h * ary.length);
    };
    results = [];
    for (j = 0, len = ary.length; j < len; j++) {
      x = ary[j];
      results.push(f(x));
    }
    return results;
  }

  export function mode(ary:Float[]):Float {
    return ary[findMax(KDE(ary,0))[1]];
  }

  export function gaussian(x:Float):Float {
    return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
  }

  export function findMax(ary:Float[], min?:Float, max?:Float):[Float, Integer] {
    var i, index, j, ref, ref1, result;
    if (min == null) {
      min = 0;
    }
    if (max == null) {
      max = ary.length - 1;
    }
    result = -Infinity;
    index = -1;
    for (i = j = ref = min, ref1 = max; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
      if (!(ary[i] > result)) {
        continue;
      }
      result = ary[i];
      index = i;
    }
    return [result, index];
  }

  export function findMin(ary:Float[], min?:Float, max?:Float):[Float, Integer] {
    var i, index, j, ref, ref1, result;
    if (min == null) {
      min = 0;
    }
    if (max == null) {
      max = ary.length - 1;
    }
    result = Infinity;
    index = -1;
    for (i = j = ref = min, ref1 = max; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
      if (!(ary[i] < result)) {
        continue;
      }
      result = ary[i];
      index = i;
    }
    return [result, index];
  }
}
