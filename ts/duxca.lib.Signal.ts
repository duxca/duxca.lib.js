/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../thirdparty/dsp/dsp.d.ts" />
/// <reference path="./duxca.lib.ts" />


module duxca.lib.Signal {
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

  export function calcCorr(signal:FloatArray, input:FloatArray, sampleRate?:Integer):Float32Array {
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

  getChirps = (actx, freqs)->
    new Promise (resolve, reject)->
      prms = freqs.map ([a, b])-> getPCM(actx, new OSC(actx).chirp(a, b, actx.currentTime, 0.04), 0.04)
      Promise.all(prms).then(resolve)

  calcSpectrogram = (sampleRate, windowSize, slideWidth, buffer)->
    #self.importScripts("https://dl.dropboxusercontent.com/u/265158/dsp.js") # dsp.js
    fft = new FFT(windowSize, sampleRate)
    point = 0
    spectrogram = []
    while point < buffer.length - windowSize
      _buffer = buffer.subarray(point, point + windowSize)
      fft.forward(_buffer)
      for w, j in fft.spectrum
        fft.spectrum[j] *= 80 * -1 * Math.log((fft.bufferSize/2 - j) * (0.5/fft.bufferSize/2)) * fft.bufferSize
        # equalize, attenuates low freqs and boosts highs
      spectrum = new Float32Array(fft.spectrum)
      spectrogram.push(spectrum)
      point += slideWidth
    if spectrogram.length is 0 then spectrogram.push([])
    spectrogram

  calcSpectrogram = (sampleRate, windowSize, slideWidth, buffer)->
    #self.importScripts("https://dl.dropboxusercontent.com/u/265158/dsp.js") # dsp.js
    fft = new FFT(windowSize, sampleRate)
    point = 0
    spectrogram = []
    while point < buffer.length - windowSize
      _buffer = buffer.subarray(point, point + windowSize)
      fft.forward(_buffer)
      for w, j in fft.spectrum
        #fft.spectrum[j] *= 80 * -1 * Math.log((fft.bufferSize/2 - j) * (0.5/fft.bufferSize/2)) * fft.bufferSize
        # equalize, attenuates low freqs and boosts highs
        spectrum = new Float32Array(fft.spectrum)
      spectrogram.push(spectrum)
      point += slideWidth
    if spectrogram.length is 0 then spectrogram.push([])
    spectrogram

  getTimeSeriesData = (spectrogram)->
    timeSeriesData = new Float32Array spectrogram.map (spectrum, i)->
      [].reduce.call(spectrum, ((sum, v, j)->
        gaussian = 1/Math.sqrt(2*Math.PI*0.2)*Math.exp(-Math.pow((j/spectrum.length)*10-5, 2)/(2*0.2))
        sum + v * gaussian
      ), 0) / spectrum.length
    timeSeriesData
  */

}
