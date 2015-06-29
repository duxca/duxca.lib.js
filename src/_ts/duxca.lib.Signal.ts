/// <!--reference path="../../typings/tsd.d.ts" />
/// <reference path="../../thirdparty/dsp/dsp.d.ts" />
/// <!--reference path="./duxca.lib.RecordBuffer.ts" />
/// <!--reference path="./duxca.lib.OSC.ts" />

module duxca.lib.Signal {
  import RecordBuffer = duxca.lib.RecordBuffer;
  import OSC = duxca.lib.OSC;
  
  export function indexToFreq(index:number, sampleRate:number, fftSize:number):number {
    return (index * sampleRate) / fftSize;
  }
  
  export function freqToIndex(freq:number, sampleRate:number, fftSize:number):number {
    return (freq * fftSize) / sampleRate | 0;
  }
  
  export function timeToIndex(sampleRate:number, time:number):number {
    return sampleRate * time | 0;
  }
  
  export function indexToTime(sampleRate:number, currentIndex:number):number {
    return currentIndex / sampleRate;
  }
  
  export function calcCorr(signal:Float32Array, input:Float32Array, sampleRate?:number):Float32Array {
    var fft = new FFT(input.length, sampleRate);
    fft.forward(signal);
    var sig_spectrum = new Float32Array(fft.spectrum);
    var sig_real = new Float32Array(fft.real);
    var sig_imag = new Float32Array(fft.imag);
    fft.forward(input);
    var spectrum = new Float32Array(fft.spectrum);
    var real = new Float32Array(fft.real);
    var imag = new Float32Array(fft.imag);
    var cross_real = new Float32Array(real.length);
    for(var i = 0; i<cross_real.length; i++){
      cross_real[i] = sig_real[i] * real[i] / real.length;
    }
    var cross_imag = new Float32Array(imag.length);
    for(var i = 0; i<cross_imag.length; i++){
      cross_imag[i] = sig_imag[i] * imag[i] / imag.length;
    }
    var inv_real = fft.inverse(cross_real, cross_imag);
    return inv_real;
  }

  /*
  calcCorr = (signal, f32arr)-> # f32arr.length needs signal.length*2
    cache = new Float32Array(f32arr.length + signal.length)
    cache.set(f32arr, 0)
    cache.set(f32arr.subarray(0, signal.length), f32arr.length)
    results = new Float32Array(f32arr.length)
    for _, i in f32arr
      sum = 0
      for _, j in signal
        sum += signal[j] * cache[i+j]
      results[i] = Math.abs(sum) / results.length
    results
  */
  /*
  export function getMediaStream():Promise<LocalMediaStream> {
    return new Promise(function(resolve, reject) {
      return navigator.getUserMedia({
        video: false,
        audio: true
      }, resolve, reject);
    });
  }*/
  /*
  function getPCM(actx:AudioContext, osc:AudioNode, stopTime:number=1):Promise<Float32Array> {
    return new Promise(function(resolve, reject) {
      var processor, recbuf, stopSample;
      processor = actx.createScriptProcessor(16384 / 16, 1, 1);
      recbuf = new RecordBuffer(processor.bufferSize, 1);
      stopSample = stopTime * actx.sampleRate;
      // Opera 27.0.1689.33
      // Chrome 41.0.2259.0 canary (64-bit)
      console.log(processor.onaudioprocess = function(ev) {
        var currentSample, data;
        recbuf.add([ev.inputBuffer.getChannelData(0)]);
        currentSample = recbuf.count * recbuf.bufferSize;
        if (currentSample - stopSample < 0) {
          return;
        }
        processor.disconnect(0);
        processor.onaudioprocess = null;
        data = recbuf.getChannelData(0);
        recbuf.clear();
        return resolve(data);
      });
      osc.connect(processor);
      return processor.connect(actx.destination);
    });
  }*/
  /*
  function getChirps(actx:AudioContext, freqs:[number, number][]):Promise<Float32Array[]> {
    var prms = freqs.map(function([a, b]) {
      return getPCM(actx, new OSC(actx).chirp(a, b, actx.currentTime, 0.04), 0.04);
    });
    return Promise.all(prms);
  }*/
  /*
  function getTimeSeriesData(spectrogram:Float32Array[]):Float32Array {
    var timeSeriesData = new Float32Array(spectrogram.map(function(spectrum, i) {
      return [].reduce.call(spectrum, (function(sum, v, j) {
        var gaussian = 1 / Math.sqrt(2 * Math.PI * 0.2) * Math.exp(-Math.pow((j / spectrum.length) * 10 - 5, 2) / (2 * 0.2));
        return sum + v * gaussian;
      }), 0) / spectrum.length;
    }));
    return timeSeriesData;
  }*/
  /*
  function calcSpectrogram(sampleRate:number, windowSize:number, slideWidth:number, buffer:Float32Array):Float32Array[] {
    var fft = new FFT(windowSize, sampleRate);
    var point = 0;
    var spectrogram: Float32Array[] = [];
    while (point < buffer.length - windowSize) {
      var _buffer = buffer.subarray(point, point + windowSize);
      fft.forward(_buffer);
      for (var i = 0; i < fft.spectrum.length; i++) {
        var w = fft.spectrum[i];
        var spectrum = new Float32Array(fft.spectrum);
      }
      spectrogram.push(spectrum);
      point += slideWidth;
    }
    if (spectrogram.length === 0) {
      spectrogram.push(new Float32Array(0));
    }
    return spectrogram;
  }*/

}
